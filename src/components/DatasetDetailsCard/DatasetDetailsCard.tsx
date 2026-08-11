import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileType2,
  Files,
  Flag,
  Globe2,
  HardDrive,
  Link2,
  MapPin,
  MoreHorizontal,
  Quote,
  Scale,
  Share2,
  X,
} from 'lucide-react';
import type { DatasetLocation } from '../../types/dataset';
import styles from './DatasetDetailsCard.module.css';

type DatasetDetailsCardProps = {
  dataset: DatasetLocation;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onClose: () => void;
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

const formatCoord = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(3)}° ${value >= 0 ? positive : negative}`;

export function DatasetDetailsCard({
  dataset,
  bookmarked,
  onToggleBookmark,
  onClose,
}: DatasetDetailsCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => setMenuOpen(false), [dataset.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (menuOpen) setMenuOpen(false);
      else onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, onClose]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  return (
    <article
      ref={cardRef}
      className={styles.card}
      aria-label={`Selected dataset: ${dataset.title}`}
      tabIndex={-1}
    >
      <div className={styles.thumb} aria-hidden="true">
        <div className={styles.thumbGrid} />
        <span className={styles.thumbRepo}>{dataset.repository}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={styles.headings}>
            <div className={styles.badges}>
              <span className={styles.badge}>{dataset.type}</span>
              <span className={`${styles.badge} ${styles.badgeMuted}`}>
                {dataset.dataType}
              </span>
              <span className={`${styles.badge} ${styles.badgeMuted}`}>
                {dataset.license}
              </span>
              <a
                className={styles.accession}
                href={dataset.url}
                target="_blank"
                rel="noreferrer noopener"
                title={`Open in ${dataset.repository}`}
              >
                {dataset.accession}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <h2 className={styles.title} title={dataset.title}>
              {dataset.title}
            </h2>
            <p className={styles.description}>{dataset.description}</p>
          </div>

          <div className={styles.topActions}>
            <button
              type="button"
              className={`${styles.iconButton} ${
                bookmarked ? styles.iconButtonActive : ''
              }`}
              onClick={() => onToggleBookmark(dataset.id)}
              aria-pressed={bookmarked}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark dataset'}
            >
              {bookmarked ? (
                <BookmarkCheck size={16} aria-hidden="true" />
              ) : (
                <Bookmark size={16} aria-hidden="true" />
              )}
              <span className="srOnly">
                {bookmarked ? 'Remove bookmark' : 'Bookmark dataset'}
              </span>
            </button>

            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title="More actions"
            >
              <MoreHorizontal size={16} aria-hidden="true" />
              <span className="srOnly">More actions</span>
            </button>

            <button
              type="button"
              className={styles.iconButton}
              onClick={onClose}
              title="Close dataset details"
            >
              <X size={16} aria-hidden="true" />
              <span className="srOnly">Close dataset details</span>
            </button>

            {menuOpen && (
              <div className={styles.menu} role="menu">
                <button type="button" className={styles.menuItem} role="menuitem">
                  <Download size={14} aria-hidden="true" />
                  Download all files
                </button>
                <button type="button" className={styles.menuItem} role="menuitem">
                  <Copy size={14} aria-hidden="true" />
                  Copy accession
                </button>
                <button type="button" className={styles.menuItem} role="menuitem">
                  <Quote size={14} aria-hidden="true" />
                  Copy citation
                </button>
                <button type="button" className={styles.menuItem} role="menuitem">
                  <Share2 size={14} aria-hidden="true" />
                  Share dataset
                </button>
                <button type="button" className={styles.menuItem} role="menuitem">
                  <Link2 size={14} aria-hidden="true" />
                  Copy API endpoint
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <Database size={11} aria-hidden="true" />
              Repository
            </div>
            <div className={styles.metaValue}>{dataset.repository}</div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <Flag size={11} aria-hidden="true" />
              Country
            </div>
            <div className={styles.metaValue} title={dataset.country}>
              {dataset.country}
            </div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <Globe2 size={11} aria-hidden="true" />
              Region
            </div>
            <div className={styles.metaValue}>{dataset.region}</div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <CalendarDays size={11} aria-hidden="true" />
              Temporal coverage
            </div>
            <div className={styles.metaValue}>
              {dataset.startDate.slice(0, 4)}–{dataset.endDate.slice(0, 4)}
            </div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <CalendarDays size={11} aria-hidden="true" />
              Published
            </div>
            <div className={styles.metaValue}>
              {formatDate(dataset.publishedDate)}
            </div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <FileType2 size={11} aria-hidden="true" />
              File formats
            </div>
            <div className={styles.formats}>
              {dataset.format.map((format) => (
                <span key={format} className={styles.formatChip}>
                  {format}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <Files size={11} aria-hidden="true" />
              Files
            </div>
            <div className={styles.metaValue}>{dataset.files}</div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <HardDrive size={11} aria-hidden="true" />
              Size
            </div>
            <div className={styles.metaValue}>{dataset.size}</div>
          </div>

          <div className={styles.metaItem}>
            <div className={styles.metaLabel}>
              <Scale size={11} aria-hidden="true" />
              Licence
            </div>
            <div className={styles.metaValue}>{dataset.license}</div>
          </div>
        </div>

        <div className={styles.footer}>
          <a
            className={styles.primary}
            href={dataset.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View in {dataset.repository}
          </a>
          <button type="button" className={styles.secondary}>
            <Quote size={15} aria-hidden="true" />
            Cited by {dataset.citations}
          </button>

          <span className={styles.spacer} />

          <span className={styles.coords}>
            <MapPin size={12} aria-hidden="true" />
            {formatCoord(dataset.latitude, 'N', 'S')} ·{' '}
            {formatCoord(dataset.longitude, 'E', 'W')}
          </span>
        </div>
      </div>
    </article>
  );
}
