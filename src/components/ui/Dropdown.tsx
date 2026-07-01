import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options = [],
  value: externalValue,
  onChange,
  placeholder = '请选择',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isControlled = externalValue !== undefined;
  const currentValue = isControlled ? externalValue : internalValue;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === currentValue);
  const displayValue = selectedOption?.label || placeholder;

  const handleOptionClick = (option: DropdownOption) => {
    if (option.disabled) return;
    if (!isControlled) {
      setInternalValue(option.value);
    }
    onChange?.(option.value);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const baseClasses = 'dropdown';
  const openClass = isOpen ? 'dropdown-open' : '';
  const disabledClass = disabled ? 'dropdown-disabled' : '';

  const combinedClasses = [
    baseClasses,
    openClass,
    disabledClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div ref={dropdownRef} className={combinedClasses}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="dropdown-value">{displayValue}</span>
        <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="menu">
          {options.length === 0 ? (
            <div className="dropdown-empty">没有选项</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`dropdown-item ${
                  option.disabled ? 'dropdown-item-disabled' : ''
                } ${currentValue === option.value ? 'dropdown-item-selected' : ''}`}
                onClick={() => handleOptionClick(option)}
                disabled={option.disabled}
                role="menuitem"
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
