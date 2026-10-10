import { useEffect, useRef } from 'react';

export interface UseModalA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  restoreFocus?: boolean;
}

/**
 * Custom hook to standardize Accessibility (A11y) and Mobile UX for modal dialogs.
 * - Handles Escape key to close dialog (WCAG 2.1 Criterion 2.1.2)
 * - Prevents background page scrolling (Mobile UX scroll-bleed prevention)
 * - Restores focus to the trigger element when modal closes
 */
export function useModalA11y({
  isOpen,
  onClose,
  closeOnEscape = true,
  preventScroll = true,
  restoreFocus = true,
}: UseModalA11yOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus preservation & Scroll lock
  useEffect(() => {
    if (!isOpen) return;

    if (restoreFocus && typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }

    let originalOverflow = '';
    if (preventScroll && typeof document !== 'undefined') {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (preventScroll && typeof document !== 'undefined') {
        document.body.style.overflow = originalOverflow;
      }
      if (restoreFocus && previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, preventScroll, restoreFocus]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);
}
