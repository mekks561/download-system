import React, { useEffect, useReducer } from 'react';
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

interface DateState {
  currentDate: Date;
  displayYear: number;
  displayMonth: number;
}

type DateAction =
  | { type: 'SET_DATE'; date: Date }
  | { type: 'SET_DISPLAY'; year: number; month: number }
  | { type: 'PREV_MONTH' }
  | { type: 'NEXT_MONTH' }
  | { type: 'SET_YEAR'; year: number };

const dateReducer = (state: DateState, action: DateAction): DateState => {
  switch (action.type) {
    case 'SET_DATE':
      return {
        currentDate: action.date,
        displayYear: action.date.getFullYear(),
        displayMonth: action.date.getMonth(),
      };
    case 'SET_DISPLAY':
      return { ...state, displayYear: action.year, displayMonth: action.month };
    case 'PREV_MONTH':
      if (state.displayMonth === 0) {
        return { ...state, displayYear: state.displayYear - 1, displayMonth: 11 };
      }
      return { ...state, displayMonth: state.displayMonth - 1 };
    case 'NEXT_MONTH':
      if (state.displayMonth === 11) {
        return { ...state, displayYear: state.displayYear + 1, displayMonth: 0 };
      }
      return { ...state, displayMonth: state.displayMonth + 1 };
    case 'SET_YEAR':
      return { ...state, displayYear: action.year };
    default:
      return state;
  }
};

const DatePicker: React.FC<DatePickerProps> = ({
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = '请选择日期',
  disabled = false,
  className = '',
}) => {
  const initialDate = controlledValue !== undefined ? controlledValue : defaultValue !== undefined ? defaultValue : new Date();
  
  const [dateState, dispatchDate] = useReducer(dateReducer, {
    currentDate: initialDate,
    displayYear: initialDate.getFullYear(),
    displayMonth: initialDate.getMonth(),
  });

  const { currentDate, displayYear, displayMonth } = dateState;
  const value = controlledValue !== undefined ? controlledValue : currentDate;

  useEffect(() => {
    if (controlledValue) {
      dispatchDate({ type: 'SET_DATE', date: controlledValue });
    }
  }, [controlledValue]);

  const handlePrevMonth = () => {
    dispatchDate({ type: 'PREV_MONTH' });
  };

  const handleNextMonth = () => {
    dispatchDate({ type: 'NEXT_MONTH' });
  };

  const handleYearChange = (direction: number) => {
    dispatchDate({ type: 'SET_YEAR', year: displayYear + direction });
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(displayYear, displayMonth, day);
    if (!controlledValue) {
      dispatchDate({ type: 'SET_DATE', date: newDate });
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