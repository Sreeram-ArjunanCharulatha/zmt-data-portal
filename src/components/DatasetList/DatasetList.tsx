import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Database, MapPin } from 'lucide-react';
import type { DatasetLocation } from '../../types/dataset';
import styles from './DatasetList.module.css';

type SortKey = 'relevance' | 'datasets' | 'recent' | 'title';

type DatasetListProps = {
  datasets: DatasetLocation[];
  selectedId: string | null;
  onSelect: (dataset: DatasetLocation) => void;
};

const PAGE_SIZE = 12;

export function DatasetList({ datasets, selectedId, onSelect }: DatasetListProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>('relevance');

  /* Filters changing must not leave the user stranded on page 7. */
  useEffect(() => setPage(1), [datasets, sort]);

  const sorted = useMemo(() => {
    const copy = [...datasets];
    switch (sort) {
      case 'datasets':
        return copy.sort((a, b) => b.citations - a.citations);
      case 'recent':
        return copy.sort((a, b) => b.endDate.localeCompare(a.endDate));
      case 'title':
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return copy;
    }
  }, [datasets, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  const numberFormat = new Intl.NumberFormat('en-US');

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <p className={styles.toolbarTitle}>
          <span className={styles.toolbarStrong}>
            {numberFormat.format(sorted.length)}
          </span>{' '}
          datasets · showing {sorted.length === 0 ? 0 : start + 1}–
          {start + visible.length}
        </p>

        <label className={styles.sort}>
          <span>Sort by</span>
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort datasets"
          >
            <option value="relevance">Relevance</option>
            <option value="datasets">Most cited</option>
            <option value="recent">Most recent</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>

      <ul className={styles.list}>
        {visible.map((dataset) => (
          <li key={dataset.id}>
            <button
              type="button"
              className={`${styles.item} ${
                selectedId === dataset.id ? styles.itemSelected : ''
              }`}
              onClick={() => onSelect(dataset)}
              aria-pressed={selectedId === dataset.id}
              style={{ width: '100%' }}
            >
              <span className={styles.itemHead}>
                <span className={styles.itemThumb} aria-hidden="true">
                  <Database size={18} />
                </span>
                <span>
                  <span className={styles.itemTitle}>{dataset.title}</span>
                  <span className={styles.itemOrg}>
                    <Database
                      size={11}
                      aria-hidden="true"
                      style={{ verticalAlign: '-1px', marginRight: 4 }}
                    />
                    {dataset.repository} · {dataset.accession}
                  </span>
                </span>
              </span>

              <span className={styles.itemDesc}>{dataset.description}</span>

              <span className={styles.itemMeta}>
                <span className={`${styles.chip} ${styles.chipAccent}`}>
                  {dataset.dataType}
                </span>
                <span className={styles.chip}>{dataset.license}</span>
                <span className={styles.chip}>
                  <MapPin size={10} aria-hidden="true" />
                  {dataset.region}
                </span>
                <span className={styles.chip}>
                  {dataset.startDate.slice(0, 4)}–{dataset.endDate.slice(0, 4)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <nav className={styles.pagination} aria-label="Result pages">
        <span className={styles.pageInfo}>
          Page {safePage} of {pageCount}
        </span>

        <span className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            title="Previous page"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            <span className="srOnly">Previous page</span>
          </button>

          {Array.from({ length: pageCount }, (_, index) => index + 1)
            .filter(
              (n) =>
                n === 1 ||
                n === pageCount ||
                Math.abs(n - safePage) <= 1,
            )
            .map((n, index, arr) => (
              <span key={n} style={{ display: 'contents' }}>
                {index > 0 && arr[index - 1] !== n - 1 && (
                  <span className={styles.pageInfo}>…</span>
                )}
                <button
                  type="button"
                  className={`${styles.pageButton} ${
                    n === safePage ? styles.pageButtonActive : ''
                  }`}
                  onClick={() => setPage(n)}
                  aria-current={n === safePage ? 'page' : undefined}
                >
                  {n}
                </button>
              </span>
            ))}

          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage === pageCount}
            title="Next page"
          >
            <ChevronRight size={15} aria-hidden="true" />
            <span className="srOnly">Next page</span>
          </button>
        </span>
      </nav>
    </div>
  );
}
