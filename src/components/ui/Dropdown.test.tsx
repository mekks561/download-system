import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dropdown from './Dropdown';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Dropdown Component', () => {
  test('renders correctly', () => {
    render(<Dropdown options={options} />);
    expect(screen.getByText('请选择')).toBeInTheDocument();
  });

  test('opens dropdown on click', () => {
    render(<Dropdown options={options} />);
    const trigger = screen.getByText('请选择');
    fireEvent.click(trigger);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  test('selects option', () => {
    const handleChange = jest.fn();
    const { container } = render(<Dropdown options={options} onChange={handleChange} />);
    
    const trigger = container.querySelector('.dropdown-trigger');
    fireEvent.click(trigger!);
    fireEvent.click(screen.getByText('Option 1'));
    
    expect(handleChange).toHaveBeenCalledWith('option1');
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  test('shows selected value', () => {
    render(<Dropdown options={options} value="option2" />);
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  test('closes when clicking outside', () => {
    render(<Dropdown options={options} />);
    const trigger = screen.getByText('请选择');
    fireEvent.click(trigger);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    fireEvent.click(document.body);
  });

  test('is disabled when disabled prop is true', () => {
    const handleChange = jest.fn();
    const { container } = render(<Dropdown options={options} disabled onChange={handleChange} />);
    const dropdown = container.querySelector('.dropdown');
    expect(dropdown).toHaveClass('dropdown-disabled');
  });

  test('does not select disabled option', () => {
    const disabledOptions = [
      ...options,
      { value: 'disabled', label: 'Disabled', disabled: true },
    ];
    const handleChange = jest.fn();
    render(<Dropdown options={disabledOptions} onChange={handleChange} />);
    
    const trigger = screen.getByText('请选择');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Disabled'));
    
    expect(handleChange).not.toHaveBeenCalled();
  });
});
