import * as React from 'react';

/**
 * 轻量 CSS Tooltip（零额外依赖）。
 *
 * 用法对齐 radix 风格：
 *   <TooltipProvider><Tooltip><TooltipTrigger asChild><button/></TooltipTrigger>
 *     <TooltipContent>提示</TooltipContent></Tooltip></TooltipProvider>
 *
 * 纯 group-hover 实现：Tooltip 是带 `group relative` 的内联容器，
 * TooltipContent 默认隐藏，hover 容器时显现。无 JS 状态、无 portal。
 */

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Tooltip: React.FC<TooltipProps> = ({ className = '', children, ...props }) => (
  <span className={`group relative inline-flex ${className}`} {...props}>
    {children}
  </span>
);

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ asChild, children, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, props);
  }
  return <span {...props}>{children}</span>;
};

export const TooltipContent: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <span
    className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${className}`}
    {...props}
  >
    {children}
  </span>
);
