import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Select, { SelectOption } from './Select';

const options: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select Component', () => {
  test('renders correctly', () => {
    render(<Select options={options} />);
    expect(screen.getByText('请选择')).toBeInTheDocument();
  });

  test('renders with label', () => {
    render(<Select label="Category" options={options} />);
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  test('opens dropdown on click', () => {
    render(<Select options={options} />);
    const select = screen.getByText('请选择').parentElement;
    fireEvent.click(select!);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  test('selects option', () => {
    const handleChange = jest.fn();
    render(<Select options={options} onChange={handleChange} />);
    const select = screen.getByText('请选择').parentElement;
    fireEvent.click(select!);
    fireEvent.click(screen.getByText('Option 1'));
    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  test('shows selected value', () => {
    render(<Select options={options} value="option2" />);
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  test('shows error message', () => {
    render(<Select options={options} error="Please select an option" />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    const { container } = render(<Select options={options} disabled />);
    const select = container.querySelector('.select');
    expect(select).toHaveClass('select-disabled');
  });

  test('filters options when searchable', () => {
    render(<Select options={options} searchable />);
    const select = screen.getByText('请选择').parentElement;
    fireEvent.click(select!);
    const searchInput = screen.getByPlaceholderText('搜索...');
    fireEvent.change(searchInput, { target: { value: 'Option 1' } });
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  test('handles multiple selection', () => {
    const handleChange = jest.fn();
    const { container } = render(<Select options={options} multiple onChange={handleChange} />);
    const select = container.querySelector('.select');
    fireEvent.click(select!);
    fireEvent.click(screen.getByText('Option 1'));
    fireEvent.click(select!);
    fireEvent.click(screen.getByText('Option 2'));
    expect(handleChange).toHaveBeenCalledWith('option1,option2');
  });

  test('renders disabled option', () => {
    const disabledOptions = [...options, { value: 'disabled', label: 'Disabled', disabled: true }];
    render(<Select options={disabledOptions} />);
    const select = screen.getByText('请选择').parentElement;
    fireEvent.click(select!);
    const disabledOption = screen.getByText('Disabled');
    expect(disabledOption).toHaveClass('select-option-disabled');
  });
});