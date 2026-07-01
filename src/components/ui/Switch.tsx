import React from 'react';
import { Switch as ShadcnSwitch } from './shadcn/Switch';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked: externalChecked,
  onChange,
  disabled = false,
  label,
  className = '',
}) => {
  const [internalChecked, setInternalChecked] = React.useState(false);
  const isControlled = externalChecked !== undefined;
  const isChecked = isControlled ? externalChecked : internalChecked;

  const handleChange = (checked: boolean) => {
    if (!isControlled) {
      setInternalChecked(checked);
    }
    onChange?.(checked);
  };

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <ShadcnSwitch checked={isChecked} onCheckedChange={handleChange} disabled={disabled} />
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};

export default Switch;