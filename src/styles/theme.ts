// 主题类型定义
export type ThemeMode = 'light' | 'dark' | 'auto';

// 主题配置接口
export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor?: string;
}

// 颜色变量名称映射
export const colorVariables = {
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    200: 'var(--color-primary-200)',
    300: 'var(--color-primary-300)',
    400: 'var(--color-primary-400)',
    500: 'var(--color-primary-500)',
    600: 'var(--color-primary-600)',
    700: 'var(--color-primary-700)',
    800: 'var(--color-primary-800)',
    900: 'var(--color-primary-900)',
  },
  success: {
    50: 'var(--color-success-50)',
    100: 'var(--color-success-100)',
    200: 'var(--color-success-200)',
    300: 'var(--color-success-300)',
    400: 'var(--color-success-400)',
    500: 'var(--color-success-500)',
    600: 'var(--color-success-600)',
    700: 'var(--color-success-700)',
    800: 'var(--color-success-800)',
    900: 'var(--color-success-900)',
  },
  warning: {
    50: 'var(--color-warning-50)',
    100: 'var(--color-warning-100)',
    200: 'var(--color-warning-200)',
    300: 'var(--color-warning-300)',
    400: 'var(--color-warning-400)',
    500: 'var(--color-warning-500)',
    600: 'var(--color-warning-600)',
    700: 'var(--color-warning-700)',
    800: 'var(--color-warning-800)',
    900: 'var(--color-warning-900)',
  },
  error: {
    50: 'var(--color-error-50)',
    100: 'var(--color-error-100)',
    200: 'var(--color-error-200)',
    300: 'var(--color-error-300)',
    400: 'var(--color-error-400)',
    500: 'var(--color-error-500)',
    600: 'var(--color-error-600)',
    700: 'var(--color-error-700)',
    800: 'var(--color-error-800)',
    900: 'var(--color-error-900)',
  },
  gray: {
    50: 'var(--color-gray-50)',
    100: 'var(--color-gray-100)',
    200: 'var(--color-gray-200)',
    300: 'var(--color-gray-300)',
    400: 'var(--color-gray-400)',
    500: 'var(--color-gray-500)',
    600: 'var(--color-gray-600)',
    700: 'var(--color-gray-700)',
    800: 'var(--color-gray-800)',
    900: 'var(--color-gray-900)',
  },
};

// 间距变量
export const spacing = {
  xs: 'var(--spacing-xs)',
  sm: 'var(--spacing-sm)',
  md: 'var(--spacing-md)',
  lg: 'var(--spacing-lg)',
  xl: 'var(--spacing-xl)',
  ['2xl']: 'var(--spacing-2xl)',
};

// 字体大小变量
export const fontSize = {
  xs: 'var(--font-size-xs)',
  sm: 'var(--font-size-sm)',
  md: 'var(--font-size-md)',
  lg: 'var(--font-size-lg)',
  xl: 'var(--font-size-xl)',
  ['2xl']: 'var(--font-size-2xl)',
  ['3xl']: 'var(--font-size-3xl)',
};

// 圆角变量
export const radius = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: 'var(--radius-full)',
};

// 阴影变量
export const shadow = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
};

// 过渡时间变量
export const transition = {
  fast: 'var(--transition-fast)',
  normal: 'var(--transition-normal)',
  slow: 'var(--transition-slow)',
};

// Z-index层级
export const zIndex = {
  dropdown: 'var(--z-index-dropdown)',
  sticky: 'var(--z-index-sticky)',
  fixed: 'var(--z-index-fixed)',
  modalBackdrop: 'var(--z-index-modal-backdrop)',
  modal: 'var(--z-index-modal)',
  popover: 'var(--z-index-popover)',
  tooltip: 'var(--z-index-tooltip)',
};

// 文本颜色
export const textColor = {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  muted: 'var(--color-text-muted)',
  disabled: 'var(--color-text-disabled)',
};

// 背景颜色
export const bgColor = {
  primary: 'var(--color-bg-primary)',
  secondary: 'var(--color-bg-secondary)',
  tertiary: 'var(--color-bg-tertiary)',
  overlay: 'var(--color-bg-overlay)',
};

// 边框颜色
export const borderColor = {
  primary: 'var(--color-border-primary)',
  secondary: 'var(--color-border-secondary)',
  focus: 'var(--color-border-focus)',
};

// 导出完整主题对象
export const theme = {
  colors: colorVariables,
  spacing,
  fontSize,
  radius,
  shadow,
  transition,
  zIndex,
  text: textColor,
  bg: bgColor,
  border: borderColor,
};

export default theme;