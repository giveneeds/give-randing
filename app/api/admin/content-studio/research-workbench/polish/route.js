import { NextResponse } from 'next/server';

// R2 한국어 보정(gpt-5)도 길게 걸려 Vercel 기본 타임아웃을 넘긴다. webhook 패턴과 동일하게 한도 상향.
export const runtime = 'nodejs';
export const maxDuration = 300;

const OPENAI_BASE = 'https://api.openai.com/v1';
const DEFAULT_POLISH_MODEL = process.env.OPENAI_THREAD_MODEL || 'gpt-5';

const POLISH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    draft: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        title: { type: 'string' },
        format: { type: 'string' },
        posts: {
          type: 'array',
          minItems: 7,
          maxItems: 15,
          items: { type: 'string' },
        },
        evidence: {
          type: 'array',
          items: { type: 'string' },
        },
        source_links: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: { type: 'string' },
              url: { type: 'string' },
              source_domain: { type: 'string' },
            },
            required: ['label', 'url', 'source_domain'],
          },
        },
        risk: { type: 'string' },
        tone_notes: { type: 'string' },
      },
      required: ['id', 'label', 'title', 'format', 'posts', 'evidence', 'source_links', 'risk', 'tone_notes'],
    },
  },
  required: ['draft'],
};

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY 환경변수가 필요합니다.');
  return key;
}

function parseDraftResponse(json) {
  const choice = json.choices?.[0] || {};
  const content = choice.message?.content || '';
  if (!content) {
    const reason = choice.finish_reason ? ` finish_reason=${choice.finish_reason}` : '';
    throw new Error(`OpenAI 응답이 비어 있습니다.${reason}`);
  }
  return JSON.parse(content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

function buildPolishPrompt({ draft, contentPlan }) {
  const postCountRule = 'R2의 posts는 issue_explainer 안에서 소재에 맞게 유지합니다. 뉴스/릴리즈/규제 사건은 7~8개, 전문가 발언/팁/개념 해설 이슈는 10~15개까지 허용합니다. R1이 충분히 길면 7~8개로 억지 압축하지 마세요.';
  return [
    '당신은 한국어 Threads 발행문 현지화 보정자입니다.',
    '',
    '역할:',
    '- 아래 R1 초안의 사실, 순서, 근거, 출처 링크를 유지합니다.',
    '- 새 정보를 추가하지 않습니다.',
    '- 새로운 발행 예고, 다음 글 예고, 다른 정책/사건 묶음 예고를 만들지 않습니다.',
    '- 사용자가 명시하지 않은 “계속 정리할 예정”, “다음엔 OO 다룸”, “OO도 같이 올릴 예정” 같은 문장을 쓰지 않습니다.',
    '- 목적은 외국 기사식 문장 배열을 한국어 발행문으로 자연스럽게 현지화하는 것입니다.',
    '- 번역이 아니라 재배열입니다. 사실은 유지하되 한국어 독자가 바로 이해하는 순서로 문장을 다시 놓습니다.',
    '- R1이 문장 단위로 너무 잘게 쪼개져 있으면, 사실과 순서를 유지한 채 post 경계를 다시 묶을 수 있습니다.',
    `- ${postCountRule}`,
    '',
    '발행문 말투·종결어미 (톤 DNA, 주제와 무관하게 항상 적용):',
    '- 문장은 동사·형용사 어간에 ~음/~함/~임/~됨을 붙여 끝냅니다. 눈으로 빠르게 읽히는 호흡을 만듭니다.',
    '- 문장을 명사로 끝내지 마세요. "보도.", "주장.", "분석.", "해석.", "요지.", "흐름.", "신호." 같은 명사 종결은 금지입니다.',
    '  명사 종결은 서술형으로 풉니다: "보도됐음", "~라고 주장했음", "~로 분석함", "~라는 게 핵심임", "~라는 신호임".',
    '- 해요체(~요), 합쇼체(~습니다)로 늘여 쓰지 마세요. 단, 독자 호출("~보셈", "~손")과 질문("~냐?", "~거냐?")은 예외로 둡니다.',
    '- 인용·근거도 명사로 끊지 말고 서술형으로 씁니다: "행사 발표로 알려진 바임.", "업체 측 설명에 기반한 주장으로 보면 됨.".',
    '- 한 줄은 짧게 끊고, 옆사람에게 말하듯 단정적으로 씁니다.',
    '- 단, 모든 글을 사장님/마케터 대상으로 닫지 마세요. content_plan.issue_plan.audience_callout에 맞는 독자만 유지합니다.',
    '- 소재가 글쓰기, 전문가 팁, 직업 능력, 공부, 습관이면 “머릿속엔 많은데 말로 못 꺼내는 사람”처럼 심리 상태로 독자를 잡아도 됩니다.',
    '',
    '자연스러운 흐름:',
    '- 글의 구조를 설명하는 메타 문장은 제거합니다. “장면 하나 고정하자.”, “받침은 이렇게 나온다.”, “정리부터 하자.”처럼 내용 없이 구조만 가리키는 문장은 바로 그 사실 문장으로 바꿉니다.',
    '- 구체 대상이 없는 추상 비유는 풉니다. “어디에 먼저 꽂았는가”, “축이 옮겨감”처럼 주어, 대상이 안 보이면 누가 무엇을 했는지 구체 명사로 바꿉니다.',
    '- 각 문장이 앞 문장의 구체 대상을 이어받게 하고, 조사와 서술어가 끊기지 않게 연결합니다. 한 사람이 쭉 이어서 쓴 글로 읽혀야 합니다.',
    '',
    '대상·표현 현지화 (직역 분류명을 호칭/장면으로):',
    '- 영어 직역처럼 보이는 분류명이 나오면 아래 절차를 적용합니다. 예시 단어를 외우지 말고, 어떤 단어가 나와도 같은 절차로 처리합니다.',
    '- (1) 의미 분해: 이 표현이 진짜 가리키는 대상이나 행동이 무엇인지 풉니다.',
    '- (2) 입말 테스트: 한국 사람이 실제로 이렇게 부르는지 봅니다. 이미 자연스러운 말(사장님, 자영업자, 마케터, 1인 사업자)이면 그대로 둡니다.',
    '- (3) 분류 → 호칭: 입말 테스트를 탈락한 분류명(작은 사업자, 솔루션 파트너, 이해관계자, 타깃 고객)은 3인칭 분류 대신 부르는 호칭이나 구체 대상으로 바꿉니다.',
    '- (4) 추상 → 행동: “작은”, “스마트”, “최적의” 같은 추상 속성은 그 속성을 만든 구체 행동으로 바꿉니다. 예: “작은 사업자” → “혼자 광고까지 챙기는 사장님”.',
    '- (5) 거울 테스트: 독자가 “이거 나잖아” 하고 멈추는지 봅니다. 안 멈추면 더 구체화합니다.',
    '- 예: “작은 사업자” → “혼자 다 하는 사장님”. “타깃 고객” → “살까 말까 고민하는 사람”. “솔루션 파트너” → “광고를 대신 돌려주는 회사”. “얼리어답터” → “남보다 먼저 써보는 사람”.',
    '- 단, 모든 명사를 바꾸지 마세요. (2) 입말 테스트를 통과하는 말은 그대로 둡니다. 억지 변환은 오히려 어색합니다.',
    '',
    '반복 금지 (한 글 안에서 매번 달라야 함):',
    '- 같은 종결어미를 세 줄 연속 똑같이 쓰지 마세요. 음/함/임/됨/질문/명령을 섞어 리듬을 만듭니다.',
    '- 같은 전환 문구를 한 글에서 두 번 쓰지 마세요. "이게 핵심임" 같은 표현을 카드마다 반복하지 않습니다.',
    '- 번호 나열 1) 2) 3)은 한 글에서 최대 한 번, 정보가 실제로 병렬일 때만 씁니다. 모든 post를 나열로 채우지 마세요. 나열이 두 번 필요해 보이면 한쪽은 서술 흐름으로 풉니다.',
    '- 훅 방식과 강조 표현은 소재에 맞게 고르되, 정해진 한 문장 틀을 그대로 복사하지 마세요.',
    '',
    '한국어 현지화 보정 규칙:',
    '- 주어와 서술어를 최대한 가깝게 붙이세요.',
    '- 수식어가 길면 문장을 나누세요.',
    '- 번역체처럼 “A에 대해 B를 하는 구조”로 길게 끌지 말고, 사람이 말하듯 짧게 바꾸세요.',
    '- 영어식 배경 설명을 앞에 길게 쌓지 마세요. 한국어에서는 사건, 주체, 문제 행동을 먼저 보여주고 배경은 뒤에 붙입니다.',
    '- “FTC has asked a court to stop...” 같은 문장은 “FTC가 소송을 냈음. 이유는 OO 때문임.”처럼 사건과 이유를 나눠 씁니다.',
    '- “company that provides...” 같은 관계절은 직역하지 마세요. “이 회사는 OO를 팔았음. 여기에 OO도 묶었음.”처럼 두 문장으로 풉니다.',
    '- “allegedly”, “according to”는 무시하지 말고 “FTC 주장”, “소송 내용 기준”, “보도에 따르면”처럼 검증 수준을 한국어로 표시합니다.',
    '- 규제기관/소송/합의 기사에서는 확정 판결처럼 쓰지 마세요. “FTC 주장 기준”, “혐의 합의”, “제재 절차”, “합의 명령”처럼 원문 법적 상태를 유지합니다.',
    '- 첫 post는 독자가 장면을 바로 떠올릴 수 있게 고칩니다. “광고를 맞춰준다”, “AI로 최적화한다”, “성과를 올린다”처럼 감이 안 잡히는 표현은 그대로 두지 마세요.',
    '- 첫 post가 너무 넓은 대상 호출형이면 사건 장면형으로 바꿀 수 있습니다. 원문에 강한 숫자, 사람, 회사, 기관, 날짜가 있으면 그 장면을 먼저 보여주세요.',
    '- 사건 장면형 훅은 “어제 OO에 무슨 일이 올라옴.”, “OO 만든 회사가 어제 SEC에 서류를 냄.”, “미국 규제기관이 AI 광고 하나를 잡았음.”처럼 시작합니다.',
    '- 대상 호출형과 사건 장면형을 동시에 섞지 말고, 한 글 안에서는 하나의 훅 방식을 선택해 밀고 갑니다.',
    '- 추상 표현은 바로 다음 줄에서 무엇을 보고, 누구에게, 어떤 행동이나 광고를 보여준다는 뜻인지 구체 장면으로 풉니다.',
    '- “끝판왕”, “역대급”, “미쳤다”, “대박”처럼 신뢰도를 깎는 과장 관용어는 자연스럽게 낮춥니다.',
    '- 솔깃함을 표현해야 하면 “광고주 입장에선 꽤 솔깃한 기능”, “진짜라면 타겟팅 기준이 달라지는 얘기”처럼 구체적으로 씁니다.',
    '- 근거 없이 “거의 다”, “대부분”, “전부”, “항상”, “무조건”처럼 넓게 단정한 문장은 낮춥니다.',
    '- 업계 분위기는 “요즘 자주 들리는 말”, “광고에서 자주 보이는 표현”, “이런 식으로 팔리는 경우가 있음”처럼 근거 수준에 맞게 표현합니다.',
    '- 넓은 일반화가 필요하면 “이번 FTC 보도자료 기준”, “이번 기사에 나온 주장 기준”처럼 범위를 붙입니다.',
    '- 첫 post 끝에는 다음 post를 당기는 짧은 전환을 둘 수 있습니다. 고정 문구처럼 반복하지 말고 소재에 맞게 변주합니다.',
    '- 좋은 전환은 짧고, 판단이 먼저 보이고, 다음 문단에서 이유를 듣고 싶게 만듭니다.',
    '- 전환 예: “그래서 뭐가 문제냐?”, “왜 이게 껄끄럽냐?”, “이게 핵심인 이유.”, “여기부터 문제가 커짐.”, “이게 포인트임.”',
    '- “별거 아닌 얘기가 아님”처럼 힘은 있지만 방향이 흐린 문장은 피하고, 독자가 다음을 읽어야 하는 질문으로 바꿉니다.',
    '- “허위 광고로 봤음”처럼 쓰더라도 “FTC는” 또는 “FTC 주장 기준”을 붙여 누가 그렇게 봤는지 분명히 합니다.',
    '- 한 줄은 대체로 15~23자 안팎으로 오르내리게 합니다.',
    '- 26자 이상으로 길어지는 줄은 보통 두 줄로 나눕니다.',
    '- posts 배열의 각 항목은 문장 하나가 아니라 실제 Threads의 한 포스트입니다.',
    '- 문장 하나씩 1~13개로 쪼개진 구조는 합쳐서 흐름 단위 포스트로 바꾸세요.',
    '- 한 post 안에는 4~9개의 짧은 줄을 넣어도 됩니다. 줄은 짧게, post는 흐름 단위로 묶습니다.',
    '- 포스트 1개는 독자가 한 화면에서 읽는 작은 장면입니다.',
    '- 뉴스/릴리즈/규제 사건은 최종 카드 수를 7~8개로 맞춥니다.',
    '- 전문가 발언/팁/개념 해설 이슈는 최종 카드 수를 10~15개까지 유지할 수 있습니다. 핵심 논리를 줄여서 얕게 만들지 마세요.',
    '- post 경계는 독자의 질문이 바뀌는 순간에 둡니다. 무슨 일, 누가, 왜, 더 큰 흐름, 그래서 뭐 같은 질문이 바뀌면 다음 post로 넘어갑니다.',
    '- 전문가 발언/팁 이슈에서는 질문 흐름이 “무슨 말?”, “왜 중요함?”, “대부분의 오해?”, “머릿속에서 벌어지는 일?”, “일상에서 왜 중요?”, “오늘 뭘 할까?”로 이동해야 합니다.',
    '- “선을 넘었음”, “큰일났음” 같은 표현은 쓸 수 있습니다. 다만 주어와 상황이 붙어야 합니다.',
    '- 강한 문장 뒤에는 어떤 약속이나 주장이 문제인지 13~25자 안팎으로 바로 풀어줍니다.',
    '- “너무 세게 약속했다”처럼 기준이 흐린 문장은 피하고, 어떤 약속이나 주장이 문제인지 구체적으로 씁니다.',
    '- “무엇을 했는지”보다 “그게 독자에게 왜 걸리는지”가 비어 있으면 한 문장을 덧붙여 연결합니다. 단, 새 사실은 만들지 않습니다.',
    '- 한국 기사라 이미 자연스러우면 과하게 바꾸지 말고 어색한 부분만 고칩니다.',
    '- 단어 나열은 쉼표만 씁니다.',
    '- 가운데점, 슬래시, 화살표, 작은따옴표는 posts 안에 쓰지 않습니다.',
    '- “발행 예정”, “묶어서 올릴 예정”, “팔로우 실행” 같은 어색하거나 허락받지 않은 표현은 제거합니다.',
    '- CTA는 원문에 있더라도 과하면 줄입니다. 허용되는 수준은 “관련 흐름 필요하면 팔로우해두면 됨.” 정도입니다.',
    '- posts 중간에는 URL을 넣지 않습니다. 다만 마지막 post 맨 끝의 1차 출처 링크 1개는 반드시 그대로 유지합니다. 본문에서 지워 source_links로만 보내면 실패입니다.',
    '- R1의 마지막 post에 1차 출처 링크가 없으면 source_links 첫 번째 URL을 마지막 post 맨 끝에 붙입니다. 링크는 source_links에도 그대로 남깁니다.',
    '',
    '수정 금지:',
    '- 사실관계 변경 금지',
    '- 수치 변경 금지',
    '- 회사명, 기관명, 인물명 변경 금지',
    '- 새 사례 추가 금지',
    '- 새로운 주장 추가 금지',
    '- evidence, source_links 삭제 금지',
    '',
    '<톤_레퍼런스>',
    '아래는 목표 말투와 호흡의 기준입니다. 주제는 서로 다르지만 종결어미(~음/~함), 짧은 호흡, 호출형 도입, 질문형 전환이 공통입니다.',
    '문장을 그대로 베끼지 말고 말투와 리듬만 가져오세요. 사실은 <r1_draft>를 따르고, 문장부호는 위 보정 규칙(가운데점·슬래시·화살표 금지)을 따릅니다.',
    '',
    '[예시 1 — 광고/마케팅 업계]',
    '마케팅 대행사 없이 직접 광고, 콘텐츠, 리뷰 챙기는 사장님들 한 번 보셈.',
    '대형 회사 제일기획이 자기 정체성 갈아탄다고 함.',
    '5월 말 테크 쇼케이스 열고 생성형 AI 자동화, 리테일 시뮬, CRM 등 17개 솔루션 공개했음.',
    '광고 에이전시에서 마케팅 테크 파트너로 간다 선언한 셈임.',
    '자 이게 무슨 의미냐?',
    '제작부터 집행, 학습까지 한 루프로 도는 그림임.',
    '여기서 반전. 이건 광고업계 내부 소식이 아니라 경계선 문제임.',
    '대행 위탁이랑 직접 운영의 선이 어디로 그어질지 가늠하는 신호임.',
    '',
    '[예시 2 — 부동산/임대]',
    '전세 끼고 집 알아보던 사람들 잠깐 보셈.',
    '지난달부터 은행들이 전세대출 한도를 슬그머니 조였음.',
    '같은 소득, 같은 집인데 작년보다 수천만 원씩 덜 나온다는 얘기 돎.',
    '자 이게 무슨 의미냐?',
    '실수요자가 매물 잡는 타이밍이 통째로 밀린다는 거임.',
    '근데 더 중요한 건 따로 있음. 집값이 아니라 대출 가능액이 거래를 막는 구간으로 들어섰음.',
    '',
    '[예시 3 — 세무/절세]',
    '5월 종소세 신고하고 세금 폭탄 맞은 사장님들 손.',
    '올해부터 간편장부 인정 기준이 빡세졌음.',
    '경비로 막 넣던 항목들이 줄줄이 인정 안 됐다는 후기 쏟아짐.',
    '왜 이게 중요하냐면. 내년부터는 얼마 벌었냐보다 근거 남겼냐로 세금이 갈림.',
    '영수증, 계좌 내역, 계약서 안 챙기면 그대로 추징임.',
    '</톤_레퍼런스>',
    '',
    '<content_plan>',
    JSON.stringify(contentPlan || {}, null, 2),
    '</content_plan>',
    '',
    '<r1_draft>',
    JSON.stringify(draft || {}, null, 2),
    '</r1_draft>',
    '',
    '출력은 JSON schema를 따르세요. draft 하나만 반환하세요.',
  ].join('\n');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const draft = body.draft && typeof body.draft === 'object' ? body.draft : null;
    const contentPlan = body.contentPlan && typeof body.contentPlan === 'object' ? body.contentPlan : {};

    if (!draft || !Array.isArray(draft.posts)) {
      return NextResponse.json({ error: '한국어 보정할 draft가 필요합니다.' }, { status: 400 });
    }

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify({
        model: DEFAULT_POLISH_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You localize Korean social posts for natural Korean context, word order, and rhythm. Return valid JSON only.',
          },
          { role: 'user', content: buildPolishPrompt({ draft, contentPlan }) },
        ],
        max_completion_tokens: 5000,
        reasoning_effort: 'minimal',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'polished_draft',
            strict: true,
            schema: POLISH_SCHEMA,
          },
        },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || `OpenAI API 오류 (${res.status})`, raw: json },
        { status: 502 }
      );
    }

    const parsed = parseDraftResponse(json);
    return NextResponse.json({
      draft: parsed.draft,
      model: DEFAULT_POLISH_MODEL,
      usage: json.usage || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || '한국어 보정 실패' }, { status: 500 });
  }
}
