import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input Component', () => {
  test('renders correctly', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  test('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  test('renders required indicator', () => {
    render(<Input label="Email" required />);
    const label = screen.getByText('Email');
    expect(label).toContainHTML('*');
  });

  test('handles value change', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledWith('test');
  });

  test('shows error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('shows clear button when clearable and has value', () => {
    const handleChange = jest.fn();
    render(<Input value="test" clearable onChange={handleChange} />);
    const clearBtn = screen.getByRole('button');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  test('renders icon', () => {
    render(<Input icon="🔍" />);
    const icon = screen.getByText('🔍');
    expect(icon).toBeInTheDocument();
  });

  test('handles blur event', () => {
    const handleBlur = jest.fn();
    render(<Input onBlur={handleBlur} />);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });

  test('has correct type attribute', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });
});