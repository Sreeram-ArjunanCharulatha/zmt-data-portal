import { Globe, List } from 'lucide-react';
import type { SearchTab, ViewMode } from '../../types/dataset';
import styles from './SearchTabs.module.css';

type SearchTabsProps = {
  tab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  counts: Record<SearchTab, number>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

const TABS: Array<{ id: SearchTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'dataset', label: 'Dataset' },
  { id: 'keyword', label: 'Keyword' },
  { id: 'event', label: 'Event' },
];

export function SearchTabs({
  tab,
  onTabChange,
  counts,
  viewMode,
  onViewModeChange,
}: SearchTabsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.tabs} role="tablist" aria-label="Result category">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={active}
                aria-controls="results-region"
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                {item.label}
                <span className={styles.count}>{counts[item.id]}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.right}>
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.viewButton} ${
                viewMode === 'globe' ? styles.viewButtonActive : ''
              }`}
              aria-pressed={viewMode === 'globe'}
              onClick={() => onViewModeChange('globe')}
              title="Globe view"
            >
              <Globe size={15} aria-hidden="true" />
              <span>Globe</span>
            </button>
            <button
              type="button"
              className={`${styles.viewButton} ${
                viewMode === 'list' ? styles.viewButtonActive : ''
              }`}
              aria-pressed={viewMode === 'list'}
              onClick={() => onViewModeChange('list')}
              title="Dataset list view"
            >
              <List size={15} aria-hidden="true" />
              <span>List</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
