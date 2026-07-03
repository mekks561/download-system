import React, { useState, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './shadcn';
import { Input } from './shadcn';
import { Button } from './shadcn';

export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const getDaysInMonth = (year: number, month: number): number => {
  if (month === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
    return 29;
  }
  return DAYS_IN_MONTH[month];
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const DatePicker: React.FC<DatePickerProps> = ({
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = '请选择日期',
  disabled = false,
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    if (controlledValue) return controlledValue;
    if (defaultValue) return defaultValue;
    return new Date();
  });
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());

  const value = controlledValue !== undefined ? controlledValue : currentDate;

  useEffect(() => {
    if (controlledValue) {
      setCurrentDate(controlledValue);
      setDisplayYear(controlledValue.getFullYear());
      setDisplayMonth(controlledValue.getMonth());
    }
  }, [controlledValue]);

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayYear(displayYear - 1);
      setDisplayMonth(11);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayYear(displayYear + 1);
      setDisplayMonth(0);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  const handleYearChange = (direction: number) => {
    setDisplayYear(displayYear + direction);
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(displayYear, displayMonth, day);
    if (!controlledValue) {
      setCurrentDate(newDate);
    }
    onChange?.(newDate);
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      displayMonth === today.getMonth() &&
      displayYear === today.getFullYear()
    );
  };

  const isSelected = (day: number): boolean => {
    return (
      day === value.getDate() &&
      displayMonth === value.getMonth() &&
      displayYear === value.getFullYear()
    );
  };

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const firstDay = getFirstDayOfMonth(displayYear, displayMonth);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <Button
          key={day}
          variant={isSelected(day) ? 'default' : 'ghost'}
          size="sm"
          className={`w-8 h-8 ${isToday(day) && !isSelected(day) ? 'text-blue-500 border-blue-200' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          {day}
        </Button>
      );
    }
    return days;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Input
          type="text"
          value={value ? formatDate(value) : ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          className={`cursor-pointer ${className}`}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border border-gray-200 rounded-lg shadow-lg">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => handleYearChange(-1)}>
              {'<<'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
              {'<'}
            </Button>
            <span className="text-sm font-medium">
              {displayYear}年 {MONTHS[displayMonth]}
            </span>
            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              {'>'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleYearChange(1)}>
              {'>>'}
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;