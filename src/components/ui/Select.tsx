import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  searchable?: boolean;
  multiple?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder = '请选择',
  label,
  error,
  disabled = false,
  required = false,
  className = '',
  searchable = false,
  multiple = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (multiple && value) {
      setSelectedOptions(value.split(','));
    }
  }, [value, multiple]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    return option.label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getSelectedLabel = () => {
    if (multiple) {
      const selected = options.filter(opt => selectedOptions.includes(opt.value));
      return selected.map(opt => opt.label).join(', ') || placeholder;
    }
    const selected = options.find(opt => opt.value === value);
    return selected?.label || placeholder;
  };

  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) return;

    if (multiple) {
      const newSelected = selectedOptions.includes(option.value)
        ? selectedOptions.filter(v => v !== option.value)
        : [...selectedOptions, option.value];
      setSelectedOptions(newSelected);
      onChange?.(newSelected.join(','));
    } else {
      onChange?.(option.value);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleSelectClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const baseClasses = 'select';
  const openClass = isOpen ? 'select-open' : '';
  const errorClass = error ? 'select-error' : '';
  const disabledClass = disabled ? 'select-disabled' : '';

  const combinedClasses = [
    baseClasses,
    openClass,
    errorClass,
    disabledClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="select-wrapper">
      {label && (
        <label className="select-label">
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}
      <div
        ref={selectRef}
        className={combinedClasses}
        onClick={handleSelectClick}
      >
        <div className="select-value">
          <span className="select-text">{getSelectedLabel()}</span>
          <span className="select-arrow">▼</span>
        </div>

        {isOpen && (
          <div className="select-dropdown">
            {searchable && (
              <input
                type="text"
                className="select-search"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            )}
            <div className="select-options">
              {filteredOptions.length === 0 ? (
                <div className="select-empty">没有找到匹配项</div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`select-option ${
                      multiple
                        ? selectedOptions.includes(option.value)
                          ? 'select-option-selected'
                          : ''
                        : value === option.value
                        ? 'select-option-selected'
                        : ''
                    } ${option.disabled ? 'select-option-disabled' : ''}`}
                    onClick={() => handleOptionClick(option)}
                  >
                    {multiple && (
                      <span className="select-checkbox">
                        {selectedOptions.includes(option.value) ? '✓' : ''}
                      </span>
                    )}
                    {option.label}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="select-error-message">{error}</span>}
    </div>
  );
};

export default Select;