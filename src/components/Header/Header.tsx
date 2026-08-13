import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bookmark,
  ChevronDown,
  Globe2,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { usePointerGlow } from '../../hooks/usePointerGlow';
import styles from './Header.module.css';

type HeaderProps = {
  bookmarkCount: number;
};

const NAV_ITEMS = [
  { id: 'discover', label: 'Discover' },
  { id: 'my-datasets', label: 'My Datasets' },
  { id: 'bookmarks', label: 'Bookmarks', badge: true },
  { id: 'api', label: 'API' },
  { id: 'faq', label: 'FAQ' },
  { id: 'about', label: 'About' },
] as const;

type NavButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** One nav item, with its own pointer-follow glow — `usePointerGlow`
 * needs to run per-button, so this is a separate component rather than
 * the hook being called inside the `NAV_ITEMS.map` loop. */
function NavButton({ active, onClick, children }: NavButtonProps) {
  const glowRef = usePointerGlow<HTMLButtonElement>();

  return (
    <button
      ref={glowRef}
      type="button"
      className={`${styles.navItem} glow ${active ? styles.navItemActive : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Header({ bookmarkCount }: HeaderProps) {
  const [active, setActive] = useState<string>('discover');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#main" aria-label="ZMT Data Portal home">
        <span className={styles.logo} aria-hidden="true">
          <Globe2 size={22} strokeWidth={2.1} />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>ZMT</span>
          <span className={styles.brandTag}>Data Portal · Global dataset discovery</span>
        </span>
      </a>

      <nav className={styles.nav} aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            active={active === item.id}
            onClick={() => setActive(item.id)}
          >
            {item.label}
            {'badge' in item && item.badge && (
              <span className={styles.badge}>{bookmarkCount}</span>
            )}
          </NavButton>
        ))}
      </nav>

      <div className={styles.actions}>
        <div className={styles.userWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.user}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className={styles.avatar} aria-hidden="true">
              LM
            </span>
            <span className={styles.userName}>L. Morgan</span>
            <ChevronDown size={15} aria-hidden="true" />
            <span className="srOnly">Account menu</span>
          </button>

          {menuOpen && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHeader}>
                <div className={styles.menuName}>Lena Morgan</div>
                <div className={styles.menuEmail}>l.morgan@leibniz-zmt.de</div>
              </div>
              <button type="button" className={styles.menuItem} role="menuitem">
                <User size={15} aria-hidden="true" />
                Profile
              </button>
              <button type="button" className={styles.menuItem} role="menuitem">
                <Bookmark size={15} aria-hidden="true" />
                Saved datasets ({bookmarkCount})
              </button>
              <button type="button" className={styles.menuItem} role="menuitem">
                <Settings size={15} aria-hidden="true" />
                Preferences
              </button>
              <button type="button" className={styles.menuItem} role="menuitem">
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
