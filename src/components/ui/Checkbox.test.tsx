import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Checkbox from './Checkbox';

describe('Checkbox Component', () => {
  test('renders correctly', () => {
    render(<Checkbox label="Check me" />);
    expect(screen.getByText('Check me')).toBeInTheDocument();
  });

  test('shows checked state', () => {
    render(<Checkbox checked label="Checked" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  test('handles change event', () => {
    const handleChange = jest.fn();
    render(<Checkbox onChange={handleChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  test('shows indeterminate state', () => {
    render(<Checkbox indeterminate label="Indeterminate" />);
    expect(screen.getByText('Indeterminate')).toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    render(<Checkbox disabled label="Disabled" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  test('shows required indicator', () => {
    render(<Checkbox required label="Required" />);
    const label = screen.getByText('Required');
    expect(label).toContainHTML('*');
  });

  test('toggles state on click in uncontrolled mode', () => {
    render(<Checkbox label="Toggle" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});