// 캠페인 LP 기본 폼 필드 카탈로그.
//
// 어드민이 캠페인별로 노출할 필드와 입력 방식(텍스트 vs 버튼)을 선택할 수 있도록 정의.
// 각 필드의 id 는 leads 테이블 컬럼명과 매핑되어 별도 마이그레이션 없이 저장된다.

export const FIELD_INPUT_TYPES = {
  text: { label: '텍스트 입력', icon: '⌨️' },
  button_select: { label: '버튼 선택', icon: '🔘' },
};

// 어드민이 선택할 수 있는 필드 카탈로그.
// inputTypes: 해당 필드에서 허용되는 입력 방식 (일부 필드는 텍스트만 가능)
// defaultOptions: button_select 일 때의 기본 옵션 (직접 수정 가능)
// columnKey: /api/leads 페이로드 키 (leads 테이블 컬럼)
export const AVAILABLE_FIELDS = {
  name: {
    label: '이름',
    placeholder: '홍길동',
    inputTypes: ['text'],
    columnKey: 'name',
    htmlType: 'text',
    autoComplete: 'name',
    mandatoryRequired: true, // 필수 해제 불가
  },
  phone: {
    label: '전화번호',
    placeholder: '010-1234-5678',
    inputTypes: ['text'],
    columnKey: 'phone',
    htmlType: 'tel',
    autoComplete: 'tel',
    validation: 'phone',
  },
  email: {
    label: '이메일',
    placeholder: 'you@example.com',
    inputTypes: ['text'],
    columnKey: 'email',
    htmlType: 'email',
    autoComplete: 'email',
    validation: 'email',
  },
  company_name: {
    label: '회사명',
    placeholder: '주식회사 기브니즈',
    inputTypes: ['text'],
    columnKey: 'company_name',
    htmlType: 'text',
    autoComplete: 'organization',
  },
  website_url: {
    label: '홈페이지 URL',
    placeholder: 'https://...',
    inputTypes: ['text'],
    columnKey: 'website_url',
    htmlType: 'url',
    autoComplete: 'url',
  },
  budget: {
    label: '예산',
    placeholder: '예산을 직접 입력',
    inputTypes: ['text', 'button_select'],
    columnKey: 'budget',
    htmlType: 'text',
    defaultOptions: [
      { value: 'under_100', label: '100만원 이하' },
      { value: '100_500', label: '100~500만원' },
      { value: '500_1000', label: '500~1000만원' },
      { value: 'over_1000', label: '1000만원 이상' },
      { value: 'undecided', label: '미정' },
    ],
  },
  inquiry_type: {
    label: '문의 유형',
    placeholder: '문의 유형',
    inputTypes: ['text', 'button_select'],
    columnKey: 'inquiry_type',
    htmlType: 'text',
    defaultOptions: [
      { value: 'consultation', label: '상담' },
      { value: 'quote', label: '견적' },
      { value: 'partnership', label: '제휴' },
      { value: 'other', label: '기타' },
    ],
  },
  message: {
    label: '상세 메시지',
    placeholder: '필요한 도움이나 궁금한 내용을 자유롭게 적어주세요.',
    inputTypes: ['text'],
    columnKey: 'message',
    htmlType: 'textarea',
  },
};

// 신규 캠페인 또는 basic_form_fields 가 비어있을 때의 레거시 기본값.
// 이 동작은 후방 호환을 위해 보존된다.
export const DEFAULT_BASIC_FORM_FIELDS = [
  { id: 'name',  inputType: 'text', required: true },
  { id: 'phone', inputType: 'text', required: true },
  { id: 'email', inputType: 'text', required: false },
];

const PHONE_PATTERN = /^01[016789]-?\d{3,4}-?\d{4}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// 어드민이 저장한 필드 설정을 정규화. 알 수 없는 id 는 제거.
export function normalizeBasicFormFields(rawFields) {
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    return DEFAULT_BASIC_FORM_FIELDS;
  }
  return rawFields
    .filter((f) => f && AVAILABLE_FIELDS[f.id])
    .map((f) => {
      const meta = AVAILABLE_FIELDS[f.id];
      const allowedTypes = meta.inputTypes;
      const inputType = allowedTypes.includes(f.inputType) ? f.inputType : allowedTypes[0];
      return {
        id: f.id,
        inputType,
        required: meta.mandatoryRequired ? true : Boolean(f.required),
        label: f.label || meta.label,
        placeholder: f.placeholder || meta.placeholder,
        options: inputType === 'button_select'
          ? (Array.isArray(f.options) && f.options.length > 0 ? f.options : meta.defaultOptions || [])
          : [],
      };
    });
}

// 입력값의 형식 검증. 비어있어도 required 가 아니면 통과.
export function validateFieldValue(field, value) {
  const meta = AVAILABLE_FIELDS[field.id];
  if (!meta) return null;
  const stringValue = (value ?? '').toString().trim();
  if (field.required && !stringValue) {
    return `${field.label || meta.label}을(를) 입력해 주세요.`;
  }
  if (!stringValue) return null;
  if (meta.validation === 'phone' && !PHONE_PATTERN.test(stringValue.replace(/\s/g, ''))) {
    return `${field.label || meta.label} 형식이 올바르지 않습니다. (예: 010-1234-5678)`;
  }
  if (meta.validation === 'email' && !EMAIL_PATTERN.test(stringValue)) {
    return `${field.label || meta.label} 형식이 올바르지 않습니다.`;
  }
  return null;
}
