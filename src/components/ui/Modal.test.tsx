import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal Component', () => {
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  test('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  test('renders title', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Modal Title">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Modal Title')).toBeInTheDocument();
  });

  test('calls onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  test('renders footer', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        footer={<button>Submit</button>}
      >
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });
});