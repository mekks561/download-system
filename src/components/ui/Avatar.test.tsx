import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar Component', () => {
  test('renders with image', () => {
    render(<Avatar src="test.jpg" alt="Test" />);
    const img = screen.getByAltText('Test') as HTMLImageElement;
    expect(img).toBeInTheDocument();
  });

  test('renders with name initials', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('renders with single name', () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  test('renders fallback when image fails', () => {
    const { container } = render(<Avatar src="invalid.jpg" name="Bob" />);
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(screen.getByText('BO')).toBeInTheDocument();
  });

  test('renders with different sizes', () => {
    const { container } = render(<Avatar name="Test" size="lg" />);
    expect(container.querySelector('.avatar')).toHaveClass('avatar-lg');
  });

  test('renders with different shapes', () => {
    const { container } = render(<Avatar name="Test" shape="square" />);
    expect(container.querySelector('.avatar')).toHaveClass('avatar-square');
  });

  test('renders default fallback when no src or name', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
