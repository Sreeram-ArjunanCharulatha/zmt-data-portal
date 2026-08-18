import {
  Compass,
  Crosshair,
  Globe2,
  Hand,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Move3d,
  Plus,
  Minus,
  RotateCcw,
  X,
} from 'lucide-react';
import styles from './GlobeControls.module.css';

type GlobeControlsProps = {
  helpVisible: boolean;
  fullscreen: boolean;
  /** True when the dataset card is open and vertical room is scarce. */
  compact: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  onPan: (deltaLatitude: number, deltaLongitude: number) => void;
  onToggleFullscreen: () => void;
  onToggleHelp: (visible: boolean) => void;
};

const HELP_ITEMS = [
  { icon: Hand, name: 'Drag to rotate', hint: 'Click and drag the globe' },
  { icon: Move3d, name: 'Scroll to zoom', hint: 'Use the mouse wheel' },
  { icon: MousePointerClick, name: 'Double-click', hint: 'Zoom to a location' },
  { icon: Compass, name: 'Click a cluster', hint: 'Expand it into datasets' },
];

export function GlobeControls({
  helpVisible,
  fullscreen,
  compact,
  onZoomIn,
  onZoomOut,
  onReset,
  onLocate,
  onToggleFullscreen,
  onToggleHelp,
}: GlobeControlsProps) {
  const showHelp = helpVisible && !compact;

  return (
    <div className={styles.rail}>
      {showHelp && (
        <div className={styles.help}>
          <div className={styles.helpHeader}>
            <span className={styles.helpTitle}>Globe controls</span>
            <button
              type="button"
              className={styles.helpClose}
              onClick={() => onToggleHelp(false)}
              title="Hide globe help"
            >
              <X size={15} aria-hidden="true" />
              <span className="srOnly">Hide globe help</span>
            </button>
          </div>

          <ul className={styles.helpList}>
            {HELP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name} className={styles.helpItem}>
                  <span className={styles.helpIcon} aria-hidden="true">
                    <Icon size={13} />
                  </span>
                  <span className={styles.helpText}>
                    <span className={styles.helpName}>{item.name}</span>
                    <span className={styles.helpHint}>{item.hint}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* One dock: every control the globe has, at one size. */}
      <div className={styles.toolbar} role="group" aria-label="ZMT Globe controls">
        <span className={styles.dockLabel}>
          <Globe2 size={12} aria-hidden="true" />
          ZMT Globe
        </span>
        <span className={styles.dockLabelDivider} aria-hidden="true" />

        <button
          type="button"
          className={styles.button}
          onClick={onZoomIn}
          title="Zoom in"
        >
          <Plus size={17} aria-hidden="true" />
          <span className="srOnly">Zoom in</span>
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onZoomOut}
          title="Zoom out"
        >
          <Minus size={17} aria-hidden="true" />
          <span className="srOnly">Zoom out</span>
        </button>

        <span className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          className={styles.button}
          onClick={onReset}
          title="Reset view and resume rotation"
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span className="srOnly">Reset view and resume rotation</span>
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={onLocate}
          title="Go to my location"
        >
          <Crosshair size={16} aria-hidden="true" />
          <span className="srOnly">Go to my location</span>
        </button>
        {/* No play/pause control: rotation is not a mode the user has to
            manage. Touching the globe stops it, and Reset above starts it
            again along with restoring the home view. */}

        <span className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          className={styles.button}
          onClick={onToggleFullscreen}
          aria-pressed={fullscreen}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? (
            <Minimize2 size={16} aria-hidden="true" />
          ) : (
            <Maximize2 size={16} aria-hidden="true" />
          )}
          <span className="srOnly">
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </span>
        </button>
        <button
          type="button"
          className={`${styles.button} ${showHelp ? styles.buttonActive : ''}`}
          onClick={() => onToggleHelp(!helpVisible)}
          aria-pressed={showHelp}
          title={showHelp ? 'Hide help' : 'Show help'}
        >
          <Compass size={16} aria-hidden="true" />
          <span className="srOnly">{showHelp ? 'Hide help' : 'Show help'}</span>
        </button>
      </div>
    </div>
  );
}
