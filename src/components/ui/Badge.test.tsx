import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge Component', () => {
  test('renders correctly', () => {
    render(<Badge>Badge Text</Badge>);
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  test('renders with different variants', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    expect(container.querySelector('.badge')).toHaveClass('badge-success');
  });

  test('renders with different sizes', () => {
    const { container } = render(<Badge size="lg">Large</Badge>);
    expect(container.querySelector('.badge')).toHaveClass('badge-lg');
  });

  test('renders with dot', () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    expect(container.querySelector('.badge-dot')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    expect(container.querySelector('.badge')).toHaveClass('custom-class');
  });
});
