import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './MobileFilterDrawer.module.css';

type MobileFilterDrawerProps = {
  open: boolean;
  resultLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function MobileFilterDrawer({
  open,
  resultLabel,
  onClose,
  children,
}: MobileFilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  /* Escape closes; focus moves into the drawer; body scroll is locked. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        tabIndex={-1}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>Filters</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            title="Close filters"
          >
            <X size={18} aria-hidden="true" />
            <span className="srOnly">Close filters</span>
          </button>
        </div>

        <div className={styles.content}>{children}</div>

        <div className={styles.apply}>
          <button type="button" className={styles.applyButton} onClick={onClose}>
            Show {resultLabel}
          </button>
        </div>
      </div>
    </>
  );
}
