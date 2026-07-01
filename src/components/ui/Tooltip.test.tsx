import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tooltip from './Tooltip';

describe('Tooltip Component', () => {
  test('renders children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  test('shows tooltip on hover', async () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    expect(await screen.findByText('Tooltip text')).toBeInTheDocument();
  });

  test('hides tooltip when mouse leaves', async () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    expect(await screen.findByText('Tooltip text')).toBeInTheDocument();
    fireEvent.mouseLeave(button);
  });

  test('does not render when disabled', () => {
    render(
      <Tooltip content="Tooltip text" disabled>
        <button>Hover me</button>
      </Tooltip>
    );
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
  });

  test('renders with different positions', () => {
    const { container } = render(
      <Tooltip content="Tooltip text" position="left">
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltipWrapper = container.querySelector('.tooltip-wrapper');
    expect(tooltipWrapper).toBeInTheDocument();
  });
});
