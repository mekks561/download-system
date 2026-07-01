import React from 'react';
import { Checkbox as ShadcnCheckbox } from './shadcn/Checkbox';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  indeterminate?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked: externalChecked,
  onChange,
  label,
  disabled = false,
  required = false,
  className = '',
  indeterminate = false,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(false);
  const isControlled = externalChecked !== undefined;
  const checked = isControlled ? externalChecked : internalChecked;

  const handleChange = (newChecked: boolean | 'indeterminate') => {
    const boolChecked = newChecked === 'indeterminate' ? checked : newChecked;
    if (!isControlled) {
      setInternalChecked(boolChecked);
    }
    onChange?.(boolChecked);
  };

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <ShadcnCheckbox
        checked={indeterminate ? 'indeterminate' : checked}
        onCheckedChange={handleChange}
        disabled={disabled}
        required={required}
      />
      {label && (
        <span className="text-sm text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      )}
    </label>
  );
};

export default Checkbox;