import React, { useState, useEffect, useRef } from 'react';
import './DatePicker.css';

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
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (controlledValue) return controlledValue;
    if (defaultValue) return defaultValue;
    return new Date();
  });
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : currentDate;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsOpen(false);
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
      days.push(<div key={`empty-${i}`} className="date-picker-day empty" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isDisabled = day < 1 || day > daysInMonth;
      days.push(
        <button
          key={day}
          className={`date-picker-day${isToday(day) ? ' today' : ''}${isSelected(day) ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
          onClick={() => !isDisabled && handleDateClick(day)}
          disabled={isDisabled}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <div className={`date-picker-container${className ? ` ${className}` : ''}`}>
      <input
        ref={inputRef}
        type="text"
        className="date-picker-input"
        value={value ? formatDate(value) : ''}
        placeholder={placeholder}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        readOnly
        disabled={disabled}
      />
      {isOpen && (
        <div ref={pickerRef} className="date-picker-popup">
          <div className="date-picker-header">
            <button className="date-picker-nav-btn" onClick={() => handleYearChange(-1)}>
              {'<<'}
            </button>
            <button className="date-picker-nav-btn" onClick={handlePrevMonth}>
              {'<'}
            </button>
            <span className="date-picker-title">
              {displayYear}年 {MONTHS[displayMonth]}
            </span>
            <button className="date-picker-nav-btn" onClick={handleNextMonth}>
              {'>'}
            </button>
            <button className="date-picker-nav-btn" onClick={() => handleYearChange(1)}>
              {'>>'}
            </button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAYS.map((day) => (
              <div key={day} className="date-picker-weekday">{day}</div>
            ))}
          </div>
          <div className="date-picker-days">{renderDays()}</div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;