import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ClusterNode, DatasetLocation } from '../../types/dataset';
import styles from './ClusterPanel.module.css';

type ClusterPanelProps = {
  cluster: ClusterNode;
  selectedId: string | null;
  onSelect: (dataset: DatasetLocation) => void;
  onClose: () => void;
};

/**
 * The contents of a clicked cluster, listed in full.
 *
 * A badge reading 15 means 15 deposited datasets, and this panel shows
 * all 15 — no sampling, no "and more".
 */
export function ClusterPanel({
  cluster,
  selectedId,
  onSelect,
  onClose,
}: ClusterPanelProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const regions = [...new Set(cluster.members.map((m) => m.country))];
  const where =
    regions.length === 1 ? regions[0] : `${regions.length} countries`;

  return (
    <section
      className={styles.panel}
      aria-label={`${cluster.datasetCount} datasets in this cluster`}
    >
      <header className={styles.head}>
        <div>
          <div className={styles.count}>
            {cluster.datasetCount}{' '}
            {cluster.datasetCount === 1 ? 'dataset' : 'datasets'}
          </div>
          <div className={styles.sub}>{where} · click one to open it</div>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          title="Close cluster"
        >
          <X size={15} aria-hidden="true" />
          <span className="srOnly">Close cluster</span>
        </button>
      </header>

      <ul className={styles.list}>
        {cluster.members.map((dataset) => (
          <li key={dataset.id}>
            <button
              type="button"
              className={`${styles.item} ${
                selectedId === dataset.id ? styles.itemSelected : ''
              }`}
              onClick={() => onSelect(dataset)}
              aria-pressed={selectedId === dataset.id}
            >
              <span className={styles.itemTitle}>{dataset.title}</span>
              <span className={styles.itemMeta}>
                <span className={styles.repo}>{dataset.repository}</span>
                <span>{dataset.dataType}</span>
                <span>· {dataset.country}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
