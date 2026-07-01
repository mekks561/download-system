import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Switch from './Switch';

describe('Switch Component', () => {
  test('renders correctly', () => {
    render(<Switch label="Toggle" />);
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });

  test('shows checked state', () => {
    render(<Switch checked label="Checked" />);
    const switchBtn = screen.getByRole('switch');
    expect(switchBtn).toHaveAttribute('aria-checked', 'true');
  });

  test('shows unchecked state', () => {
    render(<Switch checked={false} label="Unchecked" />);
    const switchBtn = screen.getByRole('switch');
    expect(switchBtn).toHaveAttribute('aria-checked', 'false');
  });

  test('handles click event', () => {
    const handleChange = jest.fn();
    render(<Switch onChange={handleChange} label="Click me" />);
    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  test('is disabled when disabled prop is true', () => {
    const handleChange = jest.fn();
    render(<Switch disabled onChange={handleChange} label="Disabled" />);
    const switchBtn = screen.getByRole('switch');
    expect(switchBtn).toBeDisabled();
    fireEvent.click(switchBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  test('toggles state in uncontrolled mode', () => {
    const handleChange = jest.fn();
    render(<Switch onChange={handleChange} />);
    const switchBtn = screen.getByRole('switch');
    
    expect(switchBtn).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(switchBtn);
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
