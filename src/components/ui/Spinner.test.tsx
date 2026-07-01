import React from 'react';
import { render, screen } from '@testing-library/react';
import Spinner from './Spinner';

describe('Spinner Component', () => {
  test('renders spinner correctly', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(container.querySelector('.spinner-circle')).toBeInTheDocument();
  });

  test('renders with label', () => {
    render(<Spinner label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with different sizes', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector('.spinner')).toHaveClass('spinner-lg');
  });

  test('renders with different variants', () => {
    const { container } = render(<Spinner variant="primary" />);
    expect(container.querySelector('.spinner')).toHaveClass('spinner-primary');
  });

  test('renders with custom className', () => {
    const { container } = render(<Spinner className="custom-spinner" />);
    expect(container.querySelector('.spinner')).toHaveClass('custom-spinner');
  });

  test('has correct aria attributes', () => {
    render(<Spinner label="Loading data" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading data');
  });

  test('has default aria-label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });
});