import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import styles from './SearchBar.module.css';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onToggleAdvanced: () => void;
  advancedOpen: boolean;
};

/** Example queries offered under the "Shortcuts" disclosure. */
const SHORTCUTS = [
  'coral bleaching',
  'mangrove',
  'sea surface temperature',
  'Sentinel',
  'drought',
  'permafrost',
];

export function SearchBar({
  value,
  onChange,
  onToggleAdvanced,
  advancedOpen,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* "/" focuses search, Escape blurs it — standard for search-first apps. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    inputRef.current?.blur();
  };

  return (
    <section className={styles.section} aria-label="Dataset search">
      <form className={styles.inner} role="search" onSubmit={submit}>
        <div className={styles.row}>
          <div className={`${styles.field} ${focused ? styles.fieldFocused : ''}`}>
            <Search size={21} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              className={styles.input}
              placeholder="Search datasets, keywords, events or locations..."
              aria-label="Search datasets, keywords, events or locations"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') event.currentTarget.blur();
              }}
            />

            {value.length > 0 && (
              <button
                type="button"
                className={styles.clear}
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                title="Clear search"
              >
                <X size={15} aria-hidden="true" />
                <span className="srOnly">Clear search</span>
              </button>
            )}

            <button
              type="button"
              className={`${styles.settingsButton} ${
                advancedOpen ? styles.settingsButtonActive : ''
              }`}
              onClick={onToggleAdvanced}
              aria-pressed={advancedOpen}
              title="Search settings and advanced filters"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span>Filters</span>
            </button>

            <span className={styles.divider} aria-hidden="true" />

            <button type="submit" className={styles.searchButton}>
              <span>Search</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className={styles.shortcutsToggle}
          onClick={() => setShortcutsOpen((open) => !open)}
          aria-expanded={shortcutsOpen}
        >
          <ChevronRight
            size={13}
            aria-hidden="true"
            className={`${styles.caret} ${shortcutsOpen ? styles.caretOpen : ''}`}
          />
          Shortcuts
        </button>

        {shortcutsOpen && (
          <div className={styles.chips}>
            {SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut}
                type="button"
                className={styles.chip}
                onClick={() => onChange(shortcut)}
              >
                {shortcut}
              </button>
            ))}
          </div>
        )}
      </form>
    </section>
  );
}
