import React, { useState } from 'react';
import { Input as ShadcnInput } from './shadcn/Input';

export type InputType = 'text' | 'password' | 'email' | 'number' | 'search';

export interface InputProps {
  type?: InputType;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  min?: string | number;
  max?: string | number;
  style?: React.CSSProperties;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  value = '',
  onChange,
  onBlur,
  placeholder = '',
  label,
  error,
  disabled = false,
  required = false,
  className = '',
  icon,
  clearable = false,
  onClear,
  min,
  max,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
    onClear?.();
  };

  const showClear = clearable && value && !disabled && !error;

  const baseClasses = '';
  const focusClass = isFocused ? '' : '';
  const errorClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  const disabledClass = disabled ? '' : '';
  const iconClass = icon ? '' : '';

  const combinedClasses = [
    baseClasses,
    focusClass,
    errorClass,
    disabledClass,
    iconClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <ShadcnInput
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={combinedClasses}
          min={min}
          max={max}
          style={style}
        />
        {showClear && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          >
            ✕
          </button>
        )}
      </div>
      {error && <span className="block text-sm text-red-500">{error}</span>}
    </div>
  );
};

export default Input;