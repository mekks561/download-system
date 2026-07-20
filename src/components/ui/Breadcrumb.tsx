import React from 'react';

export interface BreadcrumbItem {
  id?: string;
  title: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  className = '',
}) => {
  return (
    <nav className={`flex items-center gap-1 ${className}`} aria-label="breadcrumb">
      <ol className="flex items-center gap-1 list-none p-0 m-0">
        {items.map((item) => {
          const isLast = items.indexOf(item) === items.length - 1;
          const isClickable = item.href || item.onClick;
          const key = item.id ?? (typeof item.title === 'string' ? item.title : Math.random().toString(36).slice(2));

          return (
            <li key={key} className="flex items-center gap-1">
              {isClickable ? (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-500 transition-colors"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  <span>{item.title}</span>
                </a>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  <span>{item.title}</span>
                </span>
              )}
              {!isLast && <span className="mx-1">{separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;