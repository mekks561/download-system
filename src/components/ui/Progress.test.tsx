import React from 'react';
import { render, screen } from '@testing-library/react';
import Progress from './Progress';

describe('Progress Component', () => {
  test('renders linear progress correctly', () => {
    const { container } = render(<Progress value={50} />);
    expect(container.querySelector('.progress-linear')).toBeInTheDocument();
  });

  test('renders circular progress correctly', () => {
    const { container } = render(<Progress value={50} variant="circular" />);
    expect(container.querySelector('.progress-circular')).toBeInTheDocument();
  });

  test('shows value when showValue is true', () => {
    render(<Progress value={75} showValue />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('renders with different colors', () => {
    const { container } = render(<Progress value={50} color="success" />);
    expect(container.querySelector('.progress')).toHaveClass('progress-success');
  });

  test('renders with different sizes', () => {
    const { container } = render(<Progress value={50} size="lg" />);
    expect(container.querySelector('.progress')).toHaveClass('progress-lg');
  });

  test('clamps value to 0-100 range', () => {
    const { container } = render(<Progress value={150} />);
    const fill = container.querySelector('.progress-linear-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  test('clamps negative value to 0', () => {
    const { container } = render(<Progress value={-50} />);
    const fill = container.querySelector('.progress-linear-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  test('renders circular progress with showValue', () => {
    render(<Progress value={30} variant="circular" showValue />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});