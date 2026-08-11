import { useState } from 'react';
import {
  CalendarRange,
  ChevronRight,
  Database,
  FileType2,
  Flag,
  Globe2,
  Microscope,
  PanelLeftClose,
  RotateCcw,
  Scale,
} from 'lucide-react';
import type {
  DatasetFilters,
  FacetCount,
  FilterKey,
} from '../../types/dataset';
import type { Facets } from '../../hooks/useDatasetFilters';
import styles from './FilterSidebar.module.css';

type FilterSidebarProps = {
  filters: DatasetFilters;
  facets: Facets;
  datasetTotal: number;
  catalogueTotal: number;
  yearBounds: { min: number; max: number };
  activeFilterCount: number;
  embedded?: boolean;
  onToggleValue: (key: FilterKey, value: string) => void;
  onYearChange: (from: number, to: number) => void;
  onReset: () => void;
  /** Collapse the panel; omitted inside the mobile drawer. */
  onClose?: () => void;
};

const SECTIONS: Array<{
  key: FilterKey;
  label: string;
  icon: typeof Database;
  facet: keyof Facets;
}> = [
  { key: 'repositories', label: 'Repository', icon: Database, facet: 'repositories' },
  { key: 'regions', label: 'Region', icon: Globe2, facet: 'regions' },
  { key: 'countries', label: 'Country', icon: Flag, facet: 'countries' },
  { key: 'dataTypes', label: 'Data type', icon: Microscope, facet: 'dataTypes' },
  { key: 'formats', label: 'File format', icon: FileType2, facet: 'formats' },
  { key: 'licenses', label: 'Licence', icon: Scale, facet: 'licenses' },
];

const COLLAPSED_LIMIT = 6;

export function FilterSidebar({
  filters,
  facets,
  datasetTotal,
  catalogueTotal,
  yearBounds,
  activeFilterCount,
  embedded = false,
  onToggleValue,
  onYearChange,
  onReset,
  onClose,
}: FilterSidebarProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const numberFormat = new Intl.NumberFormat('en-US');

  const renderOptions = (key: FilterKey, options: FacetCount[]) => {
    const isExpanded = expanded[key] ?? false;
    const visible = isExpanded ? options : options.slice(0, COLLAPSED_LIMIT);
    const selected = filters[key];

    return (
      <div className={styles.options}>
        {visible.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selected.includes(option.value)}
              onChange={() => onToggleValue(key, option.value)}
            />
            <span className={styles.optionLabel} title={option.value}>
              {option.value}
            </span>
            <span className={styles.optionCount}>
              {numberFormat.format(option.count)}
            </span>
          </label>
        ))}

        {options.length === 0 && (
          <span className={styles.optionLabel} style={{ padding: '4px 12px' }}>
            No matching values
          </span>
        )}

        {options.length > COLLAPSED_LIMIT && (
          <button
            type="button"
            className={styles.showMore}
            onClick={() =>
              setExpanded((prev) => ({ ...prev, [key]: !isExpanded }))
            }
          >
            {isExpanded
              ? 'Show less'
              : `Show ${options.length - COLLAPSED_LIMIT} more`}
          </button>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`${styles.sidebar} ${embedded ? styles.embedded : ''}`}
      aria-label="Dataset filters"
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Filters</h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.reset}
            onClick={onReset}
            disabled={activeFilterCount === 0 && filters.query === ''}
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset all
          </button>
          {onClose && (
            <button
              type="button"
              className={styles.collapse}
              onClick={onClose}
              title="Hide filters"
            >
              <PanelLeftClose size={16} aria-hidden="true" />
              <span className="srOnly">Hide filters</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.scroll}>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const options = facets[section.facet];
          const selectedCount = filters[section.key].length;
          const isOpen = open[section.key] ?? false;

          return (
            <section key={section.key} className={styles.section}>
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => toggleSection(section.key)}
                aria-expanded={isOpen}
              >
                <Icon size={17} className={styles.sectionIcon} aria-hidden="true" />
                <span className={styles.sectionLabel}>{section.label}</span>
                <span className={styles.sectionMeta}>
                  {selectedCount > 0 ? (
                    <span className={styles.selectedDot}>{selectedCount}</span>
                  ) : (
                    options.length
                  )}
                  <ChevronRight
                    size={16}
                    className={`${styles.chevron} ${
                      isOpen ? styles.chevronOpen : ''
                    }`}
                    aria-hidden="true"
                  />
                </span>
              </button>

              {isOpen && renderOptions(section.key, options)}
            </section>
          );
        })}

        <section className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('temporal')}
            aria-expanded={open.temporal ?? false}
          >
            <CalendarRange
              size={17}
              className={styles.sectionIcon}
              aria-hidden="true"
            />
            <span className={styles.sectionLabel}>Temporal range</span>
            <span className={styles.sectionMeta}>
              <ChevronRight
                size={16}
                className={`${styles.chevron} ${
                  open.temporal ? styles.chevronOpen : ''
                }`}
                aria-hidden="true"
              />
            </span>
          </button>

          {open.temporal && (
            <div className={styles.temporal}>
              <div className={styles.temporalRow}>
                <div className={styles.yearField}>
                  <label className={styles.yearLabel} htmlFor="year-from">
                    From
                  </label>
                  <input
                    id="year-from"
                    className={styles.yearInput}
                    type="number"
                    inputMode="numeric"
                    min={yearBounds.min}
                    max={filters.yearTo}
                    value={filters.yearFrom}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) {
                        onYearChange(
                          Math.min(Math.max(next, yearBounds.min), filters.yearTo),
                          filters.yearTo,
                        );
                      }
                    }}
                  />
                </div>
                <div className={styles.yearField}>
                  <label className={styles.yearLabel} htmlFor="year-to">
                    To
                  </label>
                  <input
                    id="year-to"
                    className={styles.yearInput}
                    type="number"
                    inputMode="numeric"
                    min={filters.yearFrom}
                    max={yearBounds.max}
                    value={filters.yearTo}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) {
                        onYearChange(
                          filters.yearFrom,
                          Math.max(
                            Math.min(next, yearBounds.max),
                            filters.yearFrom,
                          ),
                        );
                      }
                    }}
                  />
                </div>
              </div>

              <input
                className={styles.slider}
                type="range"
                min={yearBounds.min}
                max={yearBounds.max}
                value={filters.yearFrom}
                aria-label="Earliest year of coverage"
                onChange={(event) =>
                  onYearChange(
                    Math.min(Number(event.target.value), filters.yearTo),
                    filters.yearTo,
                  )
                }
              />
              <p className={styles.temporalHint}>
                Shows datasets whose coverage overlaps the selected range.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className={styles.footer}>
        <div className={styles.resultsLabel}>Results</div>
        <div className={styles.resultCount}>
          {numberFormat.format(datasetTotal)}
        </div>
        <div className={styles.resultSub}>
          {datasetTotal === 1 ? 'dataset' : 'datasets'} found
          {datasetTotal !== catalogueTotal && (
            <> of {numberFormat.format(catalogueTotal)}</>
          )}
        </div>

      </div>
    </aside>
  );
}
