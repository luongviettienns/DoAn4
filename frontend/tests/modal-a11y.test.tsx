import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useModalA11y } from '../src/hooks/useModalA11y';

function TestModal({ isOpen, onClose, closeOnEscape = true }: { isOpen: boolean; onClose: () => void; closeOnEscape?: boolean }) {
  useModalA11y({ isOpen, onClose, closeOnEscape });
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="test-dialog-title">
      <h2 id="test-dialog-title">Test Modal Dialog</h2>
      <button type="button" onClick={onClose} aria-label="Đóng">Đóng</button>
    </div>
  );
}

function TestModalParent() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" id="trigger-btn" onClick={() => setOpen(true)}>Mở Modal</button>
      <TestModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

describe('useModalA11y hook', () => {
  it('calls onClose when Escape key is pressed while modal is open', () => {
    const handleClose = vi.fn();
    const { rerender } = render(<TestModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Should not call when closed
    rerender(<TestModal isOpen={false} onClose={handleClose} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('respects closeOnEscape: false option', () => {
    const handleClose = vi.fn();
    render(<TestModal isOpen={true} onClose={handleClose} closeOnEscape={false} />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('locks body scroll when modal opens and restores when it closes', () => {
    document.body.style.overflow = 'auto';
    const handleClose = vi.fn();
    const { rerender } = render(<TestModal isOpen={true} onClose={handleClose} />);

    expect(document.body.style.overflow).toBe('hidden');

    rerender(<TestModal isOpen={false} onClose={handleClose} />);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores focus to trigger button after modal is closed', () => {
    render(<TestModalParent />);
    const trigger = screen.getByText('Mở Modal');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Đóng');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
