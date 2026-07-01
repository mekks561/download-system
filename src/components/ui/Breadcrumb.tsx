import React from 'react';
import './Breadcrumb.css';

export interface BreadcrumbItem {
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  className = '',
}) => {
  return (
    <nav className={`breadcrumb ${className}`} aria-label="breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = item.href || item.onClick;

          return (
            <li key={index} className={`breadcrumb-item ${isLast ? 'breadcrumb-last' : ''}`}>
              {isClickable ? (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  className="breadcrumb-link"
                >
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-title">{item.title}</span>
                </a>
              ) : (
                <span className="breadcrumb-text">
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-title">{item.title}</span>
                </span>
              )}
              {!isLast && <span className="breadcrumb-separator">{separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;