// Seed CafeViral service with brand pitch + operational onboarding details.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = (env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/))[1].trim();
const sb = createClient(url, key);

const payload = {
  subtitle: '전략적 커뮤니티 침투를 통한 입소문 극대화',
  description:
    '광고라는 것이 티가 나는 순간 고객의 마음은 닫힙니다. CafeViral은 노골적인 홍보가 아닌, 타겟 고객이 모여있는 커뮤니티의 언어와 맥락에 자연스럽게 스며드는 \'진짜 입소문\'을 설계합니다.',
  details: {
    status: 'published',
    effects: [
      {
        title: '고관여 타겟의 사회적 증거 확보',
        desc: '맘카페·지역카페·전문직 커뮤니티 등 특정 타겟이 밀집된 공간에서 긍정 여론이 형성되며, "여기 진짜 괜찮다"라는 사회적 증거로 이어져 타 광고 매체 대비 압도적인 구매 전환율을 만들어냅니다.',
      },
      {
        title: '광고비 없이 유입량 250% 상승 사례',
        desc: '신규 런칭 서비스의 타겟 커뮤니티 침투를 통해, 광고비 투입 없이 게시글과 댓글 반응만으로 전주 대비 유입량 250% 상승과 실구매 전환을 이끌어낸 사례가 있습니다.',
      },
      {
        title: '게시글 + 댓글 + 대댓글 3중 상호작용 구성',
        desc: '1건 기준 게시글 1개 + 댓글 1개 + 대댓글 1개로 자연스러운 여론을 빌드업합니다. 질문/답변형, 후기형, 평판 비교형 등 카테고리별 시나리오를 상품 특성에 맞게 설계합니다.',
      },
      {
        title: '쪽지 대응 운영 대행',
        desc: '"정보 부탁드려요" 댓글이 발생하면 주 1회 기브니즈 운영팀이 직접 쪽지 발송 및 정보 전달을 대행하여 유입까지 끊김 없이 연결합니다.',
      },
    ],
    operation:
      '실제 활동 중인 신뢰도 높은 계정과, 업계 생리를 정확히 파악한 시나리오로 광고처럼 보이지 않는 자연스러운 여론을 형성합니다.\n\n- **타겟 카페:** 지역 맘카페(해운대맘, 강동맘 등), 지역 커뮤니티(텐인텐 등), 주제별 카페(뷰티/다이어트 등)\n- **맞춤형 원고:** 타겟 키워드와 소구 포인트(USP)를 기반으로 전문 원고팀이 시나리오 및 원고 대필\n- **빌드업 전략:** "요즘 여기 괜찮나요?"처럼 궁금증을 유발하는 1차 질문 글로 자연스러운 여론을 쌓아 올린 뒤, 후기·평판 비교 글로 확장합니다.\n\n**진행 전 준비사항**\n- **원고 레퍼런스:** 원하시는 원고 방향(질문형/후기형/비교형 등)을 선택 또는 제시\n- **셀링 포인트 3가지 이상:** 예) "사장님이 직접 구워주는 고기집", "통유리 놀이방이 있는 식당", "단열·곰팡이 잡아주는 도배" 등 구체적일수록 원고 퀄리티가 올라갑니다.',
    process: [
      {
        step: '01',
        name: '카페 리스트 + 시나리오 + 샘플 원고 전달',
        desc: '업종 맞춤 추천 카페 리스트, 시나리오 제안(질문/후기/평판 비교/생애주기형), 샘플 원고 초안 1~3개, 전체 수량·일정 제안을 한 번에 전달드립니다. 14시 이전 문의는 당일, 이후는 익일 14시 이전 전달.',
      },
      {
        step: '02',
        name: '견적서 전달 및 결제',
        desc: '샘플 원고와 시나리오 방향 확인 후, 합의된 내용 기준으로 견적서를 전달하고 결제를 진행합니다.',
      },
      {
        step: '03',
        name: '원고 작성 → 1차 컨펌 요청',
        desc: '확정된 방향성에 맞춰 전체 원고를 작성한 뒤 1차 컨펌을 요청드립니다. (결제일 기준 5영업일 이내)',
      },
      {
        step: '04',
        name: '고객 피드백',
        desc: '"OOO 표현 빼주시고 ㅁㅁㅁ 단어 넣어주세요"처럼 구체적이고 명확한 피드백을 부탁드립니다. (1차 컨펌 요청일 기준 2영업일 이내)',
      },
      {
        step: '05',
        name: '원고 수정 → 최종 컨펌 요청',
        desc: '피드백을 반영하여 수정한 뒤 최종 컨펌을 요청드립니다. 컨펌·수정은 총 2회까지 가능. (피드백 전달일 기준 3영업일 이내)',
      },
      {
        step: '06',
        name: '순차 배포 시작',
        desc: '최종 컨펌 익영업일부터 사전 협의된 일정에 따라 안전하게 분배하여 순차 침투합니다. ※ 배포 시작 후 원고 수정 불가.',
      },
      {
        step: '07',
        name: '결과 보고',
        desc: '작업 완료된 게시글과 여론(댓글 반응)을 모아 리포트로 전달드립니다. (발행 종료일 기준 7영업일 이내)',
      },
    ],
    sub_items: [
      {
        title: '기본 구성 (게시글1 + 댓글1 + 대댓글1)',
        desc: '1건 기준 3중 상호작용으로 자연스러운 빌드업. 침투 카페별 단가 상이 (최소 21,000원~, VAT 별도). 50건 이상 1,000원 할인, 100건 이상 2,000원 할인.',
      },
      {
        title: '원고 대필 (1건)',
        desc: '전문 원고팀의 맞춤형 시나리오 대필. 1건당 5,000원 (50건 이상 동일, 100건 이상 4,000원).',
      },
      {
        title: '댓글·대댓글 추가 (1건)',
        desc: '여론 강화를 위한 추가 상호작용. 1건당 5,000원 (50건 이상 동일, 100건 이상 4,000원).',
      },
      {
        title: 'A/S 보장 — 24시간 삭제 재발행',
        desc: '카페 운영진 정책에 의해 발행 후 24시간 이내 삭제될 경우 1회 무상 재배포. 특정 카페 침투 불가 시 \'A/S 가능 리스트\' 내 타 맘카페로 우회하여 수량 보장. ※ 대표님 요청 삭제 건은 A/S 불가.',
      },
    ],
    duration:
      '기획 및 준비: 3~5일\n원고 작성 → 컨펌: 결제일 기준 5영업일 이내\n배포 및 실시간 모니터링: 2~4주 (캠페인 단위)\n결과 보고: 발행 종료 후 7영업일 이내\n※ 모든 영업일 기준은 주말(토·일) 제외',
    reference_img: '',
  },
};

(async () => {
  const { error } = await sb.from('services').update(payload).eq('slug', 'cafe-viral');
  if (error) {
    console.error('FAIL:', error);
    process.exit(1);
  }
  console.log('✓ cafe-viral updated');

  const { data } = await sb.from('services').select('slug, subtitle, details').eq('slug', 'cafe-viral').single();
  const d = data.details || {};
  console.log(`subtitle: ${data.subtitle}`);
  console.log(`status: ${d.status} | effects:${(d.effects||[]).length} process:${(d.process||[]).length} sub_items:${(d.sub_items||[]).length}`);
})();
