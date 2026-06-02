export const SERVICE_TEXT_STYLE_ROLES = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'caption', 'quote'];
export const SERVICE_TEXT_STYLE_COLORS = ['default', 'muted', 'strong', 'inverse', 'brand', 'blue', 'green', 'amber', 'red'];

export const SERVICE_TEXT_ROLE_OPTIONS = [
  { value: 'body', label: '본문' },
  { value: 'h1', label: 'H1 대제목' },
  { value: 'h2', label: 'H2 큰 제목' },
  { value: 'h3', label: 'H3 소제목' },
  { value: 'h4', label: 'H4 제목' },
  { value: 'h5', label: 'H5 작은 제목' },
  { value: 'h6', label: 'H6 라벨 제목' },
  { value: 'caption', label: '작은 설명' },
  { value: 'quote', label: '인용문' },
];

export const SERVICE_TEXT_COLOR_OPTIONS = [
  { value: 'default', label: '기본', swatch: 'bg-zinc-900' },
  { value: 'muted', label: '흐림', swatch: 'bg-zinc-500' },
  { value: 'strong', label: '강조', swatch: 'bg-black' },
  { value: 'inverse', label: '밝은색', swatch: 'bg-white ring-1 ring-zinc-300' },
  { value: 'brand', label: '브랜드 블루', swatch: 'bg-blue-600' },
  { value: 'blue', label: '파랑', swatch: 'bg-sky-600' },
  { value: 'green', label: '초록', swatch: 'bg-emerald-600' },
  { value: 'amber', label: '노랑', swatch: 'bg-amber-500' },
  { value: 'red', label: '빨강', swatch: 'bg-red-600' },
];

export const DEFAULT_SERVICE_TEXT_STYLE = Object.freeze({ role: 'body', color: 'default' });

export function normalizeServiceTextStyle(style, fallback = DEFAULT_SERVICE_TEXT_STYLE) {
  const fallbackRole = SERVICE_TEXT_STYLE_ROLES.includes(fallback?.role) ? fallback.role : DEFAULT_SERVICE_TEXT_STYLE.role;
  const fallbackColor = SERVICE_TEXT_STYLE_COLORS.includes(fallback?.color) ? fallback.color : DEFAULT_SERVICE_TEXT_STYLE.color;
  const source = style && typeof style === 'object' ? style : {};

  return {
    role: SERVICE_TEXT_STYLE_ROLES.includes(source.role) ? source.role : fallbackRole,
    color: SERVICE_TEXT_STYLE_COLORS.includes(source.color) ? source.color : fallbackColor,
  };
}

export function serviceTextStyleTag(role = 'body') {
  if (role === 'h1') return 'h2';
  if (role === 'h2') return 'h2';
  if (role === 'h3') return 'h3';
  if (role === 'h4') return 'h4';
  if (role === 'h5') return 'h5';
  if (role === 'h6') return 'h6';
  if (role === 'quote') return 'blockquote';
  return 'p';
}

export function serviceTextRoleClassName(role = 'body') {
  switch (role) {
    case 'h1':
      return 'text-3xl font-black leading-tight md:text-5xl';
    case 'h2':
      return 'text-2xl font-black leading-tight md:text-4xl';
    case 'h3':
      return 'text-xl font-black leading-snug md:text-2xl';
    case 'h4':
      return 'text-lg font-extrabold leading-snug md:text-xl';
    case 'h5':
      return 'text-base font-extrabold leading-snug md:text-lg';
    case 'h6':
      return 'text-sm font-black leading-snug md:text-base';
    case 'caption':
      return 'text-xs font-semibold leading-relaxed md:text-sm';
    case 'quote':
      return 'border-l-4 border-current pl-4 text-base font-bold leading-relaxed';
    default:
      return 'text-sm font-semibold leading-relaxed md:text-[15px]';
  }
}

export function serviceTextColorClassName(color = 'default', variant = 'default') {
  const dark = variant === 'dark';
  switch (color) {
    case 'muted':
      return dark ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400';
    case 'strong':
      return dark ? 'text-white' : 'text-zinc-950 dark:text-white';
    case 'inverse':
      return 'text-white';
    case 'brand':
      return dark ? 'text-blue-200' : 'text-blue-700 dark:text-blue-300';
    case 'blue':
      return dark ? 'text-sky-200' : 'text-sky-700 dark:text-sky-300';
    case 'green':
      return dark ? 'text-emerald-200' : 'text-emerald-700 dark:text-emerald-300';
    case 'amber':
      return dark ? 'text-amber-200' : 'text-amber-700 dark:text-amber-300';
    case 'red':
      return dark ? 'text-red-200' : 'text-red-700 dark:text-red-300';
    default:
      return dark ? 'text-zinc-100' : 'text-zinc-800 dark:text-zinc-200';
  }
}

export function legacyStoryTextStyle(size = 'md', weight = 'medium') {
  if (size === 'xl' || weight === 'black') return { role: 'h3', color: 'default' };
  if (size === 'lg' || weight === 'bold') return { role: 'h4', color: 'default' };
  if (size === 'sm') return { role: 'caption', color: 'muted' };
  return DEFAULT_SERVICE_TEXT_STYLE;
}
