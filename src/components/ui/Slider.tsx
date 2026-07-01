import React, { useState } from 'react';
import { Slider as ShadcnSlider } from './shadcn/Slider';

export interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
  disabled?: boolean;
  label?: string;
  showValue?: boolean;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  value: externalValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeStart,
  onChangeEnd,
  disabled = false,
  label,
  showValue = false,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState([min]);
  const isControlled = externalValue !== undefined;
  const currentValue = isControlled ? externalValue : internalValue[0];

  const handleChange = (values: number[]) => {
    if (!isControlled) {
      setInternalValue(values);
    }
    onChange?.(values[0]);
  };

  const handleChangeStart = () => {
    onChangeStart?.();
  };

  const handleChangeEnd = () => {
    onChangeEnd?.();
  };

  return (
    <div className={className}>
      {label && <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>}
      <ShadcnSlider
        value={isControlled ? [externalValue] : internalValue}
        onValueChange={handleChange}
        onValueCommit={handleChangeEnd}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full"
      />
      {showValue && (
        <span className="block text-sm text-gray-500 mt-2">{currentValue}</span>
      )}
    </div>
  );
};

export default Slider;