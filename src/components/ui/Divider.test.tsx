import React from 'react';
import { render, screen } from '@testing-library/react';
import Divider from './Divider';

describe('Divider Component', () => {
  test('renders horizontal divider', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('.divider-horizontal')).toBeInTheDocument();
  });

  test('renders vertical divider', () => {
    const { container } = render(<Divider orientation="vertical" />);
    expect(container.querySelector('.divider-vertical')).toBeInTheDocument();
  });

  test('renders with text', () => {
    render(<Divider text="Section Title" />);
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  test('renders with different variants', () => {
    const { container } = render(<Divider variant="dashed" />);
    expect(container.querySelector('.divider')).toHaveClass('divider-dashed');
  });

  test('renders with custom className', () => {
    const { container } = render(<Divider className="custom-divider" />);
    expect(container.querySelector('.divider')).toHaveClass('custom-divider');
  });

  test('has correct aria-orientation for horizontal', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('.divider')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  test('has correct aria-orientation for vertical', () => {
    const { container } = render(<Divider orientation="vertical" />);
    expect(container.querySelector('.divider')).toHaveAttribute('aria-orientation', 'vertical');
  });
});