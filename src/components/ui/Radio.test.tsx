import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Radio from './Radio';

describe('Radio Component', () => {
  test('renders correctly', () => {
    render(<Radio value="option1" label="Option 1" />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  test('shows checked state', () => {
    render(<Radio value="option1" checked label="Checked" />);
    const radio = screen.getByRole('radio');
    expect(radio).toBeChecked();
  });

  test('handles change event', () => {
    const handleChange = jest.fn();
    render(<Radio value="option1" onChange={handleChange} />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  test('is disabled when disabled prop is true', () => {
    render(<Radio value="option1" disabled label="Disabled" />);
    const radio = screen.getByRole('radio');
    expect(radio).toBeDisabled();
  });

  test('toggles state on click in uncontrolled mode', () => {
    const handleChange = jest.fn();
    render(<Radio value="option1" onChange={handleChange} label="Toggle" />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(handleChange).toHaveBeenCalledWith('option1');
  });
});