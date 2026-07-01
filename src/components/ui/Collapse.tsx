import React, { useState } from 'react';
import './Collapse.css';

export interface CollapseProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Collapse: React.FC<CollapseProps> = ({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleToggle = () => {
    if (disabled) return;
    const newOpen = !isOpen;
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onChange?.(newOpen);
  };

  return (
    <div className={`collapse ${className}`}>
      <button
        className={`collapse-header ${isOpen ? 'collapse-open' : ''} ${disabled ? 'collapse-disabled' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className="collapse-title">{title}</span>
        <span className={`collapse-icon ${isOpen ? 'rotate' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div className={`collapse-content ${isOpen ? 'collapse-show' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export interface CollapseItemProps {
  title: React.ReactNode;
  name: string;
  disabled?: boolean;
  className?: string;
}

export interface CollapseGroupProps {
  activeKey?: string | string[];
  defaultActiveKey?: string | string[];
  onChange?: (activeKey: string | string[]) => void;
  accordion?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CollapseGroup: React.FC<CollapseGroupProps> = ({
  activeKey: controlledActiveKey,
  defaultActiveKey = '',
  onChange,
  accordion = true,
  className = '',
  children,
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState<string | string[]>(defaultActiveKey);
  const isControlled = controlledActiveKey !== undefined;
  const activeKey = isControlled ? controlledActiveKey : internalActiveKey;

  const handleChange = (name: string) => {
    let newActiveKey: string | string[];
    if (accordion) {
      newActiveKey = activeKey === name ? '' : name;
    } else {
      const currentKeys = Array.isArray(activeKey) ? activeKey : [];
      if (currentKeys.includes(name)) {
        newActiveKey = currentKeys.filter((key) => key !== name);
      } else {
        newActiveKey = [...currentKeys, name];
      }
    }
    if (!isControlled) {
      setInternalActiveKey(newActiveKey);
    }
    onChange?.(newActiveKey);
  };

  const childProps: CollapseItemProps[] = [];
  React.Children.forEach(children, (child: React.ReactNode) => {
    if (React.isValidElement(child)) {
      const props = child.props as CollapseItemProps & { children?: React.ReactNode };
      childProps.push({
        title: props.title,
        name: props.name,
        disabled: props.disabled,
        className: props.className,
      });
    }
  });

  return (
    <div className={`collapse-group ${className}`}>
      {React.Children.map(children, (child: React.ReactNode, index: number) => {
        if (React.isValidElement(child)) {
          const isActive = Array.isArray(activeKey)
            ? activeKey.includes(childProps[index].name)
            : activeKey === childProps[index].name;
          return React.cloneElement(child, {
            open: isActive,
            onChange: () => handleChange(childProps[index].name),
          } as Partial<CollapseProps>);
        }
        return child;
      })}
    </div>
  );
};

export default Collapse;