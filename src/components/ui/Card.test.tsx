import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card Component', () => {
  test('renders children correctly', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  test('renders title', () => {
    render(<Card title="Card Title">Content</Card>);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  test('renders subtitle', () => {
    render(<Card subtitle="Card Subtitle">Content</Card>);
    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
  });

  test('renders footer', () => {
    render(<Card footer={<button>Footer Button</button>}>Content</Card>);
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  test('renders with different variants', () => {
    render(<Card variant="elevated">Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('renders with different padding', () => {
    render(<Card padding="lg">Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    const { container } = render(<Card className="custom-card">Content</Card>);
    const card = container.querySelector('[class*="rounded"]');
    expect(card).toBeInTheDocument();
  });
});