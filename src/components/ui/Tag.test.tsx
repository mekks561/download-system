import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tag from './Tag';

describe('Tag Component', () => {
  test('renders correctly', () => {
    render(<Tag>Tag Content</Tag>);
    expect(screen.getByText('Tag Content')).toBeInTheDocument();
  });

  test('renders with different variants', () => {
    const { container } = render(<Tag variant="success">Success Tag</Tag>);
    expect(container.querySelector('.tag')).toHaveClass('tag-success');
  });

  test('renders close button when closable', () => {
    render(<Tag closable>Closable Tag</Tag>);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(<Tag closable onClose={handleClose}>Tag</Tag>);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  test('applies custom className', () => {
    const { container } = render(<Tag className="custom-tag">Custom</Tag>);
    expect(container.querySelector('.tag')).toHaveClass('custom-tag');
  });
});
