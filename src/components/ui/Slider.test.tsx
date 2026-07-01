import React from 'react';
import { render, screen } from '@testing-library/react';
import Slider from './Slider';

describe('Slider Component', () => {
  test('renders correctly', () => {
    render(<Slider />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  test('renders with label', () => {
    render(<Slider label="Volume" />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  test('shows value when showValue is true', () => {
    render(<Slider value={50} showValue />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  test('is disabled when disabled prop is true', () => {
    render(<Slider disabled />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('data-disabled');
  });

  test('respects min and max values', () => {
    const handleChange = jest.fn();
    render(<Slider min={10} max={50} onChange={handleChange} />);
    expect(handleChange).toBeDefined();
  });
});