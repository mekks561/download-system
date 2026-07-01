import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem as ShadcnRadioGroupItem } from './shadcn/RadioGroup';

export interface RadioProps {
  name?: string;
  value?: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Radio: React.FC<RadioProps> = ({
  value = '',
  checked: externalChecked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  const [internalChecked, setInternalChecked] = useState(false);
  const isControlled = externalChecked !== undefined;
  const isChecked = isControlled ? externalChecked : internalChecked;

  const handleChange = () => {
    if (!isControlled) {
      setInternalChecked(true);
    }
    onChange?.(value);
  };

  return (
    <RadioGroup value={isChecked ? value : undefined} onValueChange={handleChange}>
      <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
        <ShadcnRadioGroupItem
          value={value}
          disabled={disabled}
        />
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </label>
    </RadioGroup>
  );
};

export default Radio;