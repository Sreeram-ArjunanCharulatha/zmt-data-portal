import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ChevronRight, Database, SearchX } from 'lucide-react';
import { Header } from './components/Header/Header';
import { SearchBar } from './components/SearchBar/SearchBar';
import { SearchTabs } from './components/SearchTabs/SearchTabs';
import { FilterSidebar } from './components/FilterSidebar/FilterSidebar';
import { GlobeControls } from './components/GlobeControls/GlobeControls';
import { GlobeErrorBoundary } from './components/GlobeScene/GlobeErrorBoundary';
import { DatasetDetailsCard } from './components/DatasetDetailsCard/DatasetDetailsCard';
import { DatasetList } from './components/DatasetList/DatasetList';
import { MobileFilterDrawer } from './components/MobileFilterDrawer/MobileFilterDrawer';
import { ClusterPanel } from './components/ClusterPanel/ClusterPanel';
import { AnimatedCounter } from './components/AnimatedCounter/AnimatedCounter';
import {
  EMPTY_FILTERS,
  countActiveFilters,
  useDatasetFilters,
} from './hooks/useDatasetFilters';
import { useMarkerClustering } from './hooks/useMarkerClustering';
import { useGlobeCamera } from './hooks/useGlobeCamera';
import { useMediaQuery, useReducedMotion } from './hooks/useReducedMotion';
import { angularDistanceDeg, geographicCentroid } from './utils/geoMath';
import type { CameraFocus } from './components/GlobeScene/CameraRig';
import {
  TOTAL_CATALOGUE_SIZE,
  YEAR_MAX,
  YEAR_MIN,
  mockDatasets,
} from './data/mockDatasets';
import type {
  ClusterNode,
  DatasetLocation,
  FilterKey,
  SearchTab,
  ViewMode,
} from './types/dataset';
import styles from './App.module.css';

const GlobeScene = lazy(() => import('./components/GlobeScene/GlobeScene'));

const YEAR_BOUNDS = { min: YEAR_MIN, max: YEAR_MAX };

/* Orbit radius used when a single dataset is opened: close enough to
   read country and city labels around the site. */
const CLOSE_UP_DISTANCE = 1.72;

export default function App() {
  /* ------------------------------ state ------------------------------ */
  const [filters, setFilters] = useState(() => EMPTY_FILTERS(YEAR_MIN, YEAR_MAX));
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [selected, setSelected] = useState<DatasetLocation | null>(null);
  const [openCluster, setOpenCluster] = useState<ClusterNode | null>(null);
  /* Bumped on every selection so re-selecting the same dataset re-centres
     the camera even if the user has rotated away since. */
  const [focusNonce, setFocusNonce] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const reducedMotion = useReducedMotion();
  const isCompact = useMediaQuery('(max-width: 1080px)');
  const cameraHandle = useGlobeCamera();

  /* --------------------------- derived data -------------------------- */
  const { results, facets, datasetTotal, tabCounts } = useDatasetFilters(
    mockDatasets,
    filters,
  );
  const nodes = useMarkerClustering(results, zoomLevel);
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters, YEAR_MIN, YEAR_MAX),
    [filters],
  );
  const numberFormat = useMemo(() => new Intl.NumberFormat('en-US'), []);

  /* Headline figures for the portal section, derived rather than typed
     in, so they can never drift from the catalogue. */
  const portalFigures = useMemo(() => {
    const repositoryNames = [...new Set(mockDatasets.map((d) => d.repository))];
    return {
      datasets: mockDatasets.length,
      repositories: repositoryNames.length,
      countries: new Set(mockDatasets.map((d) => d.country)).size,
      locations: new Set(
        mockDatasets.map((d) => `${d.latitude},${d.longitude}`),
      ).size,
      repositoryNames,
    };
  }, []);

  /* Identity of the current query, used as the camera-focus key so the
     globe re-frames once per filter change rather than once per render. */
  const filterSignature = useMemo(
    () =>
      [
        filters.query.trim().toLowerCase(),
        filters.tab,
        filters.repositories.join(','),
        filters.countries.join(','),
        filters.dataTypes.join(','),
        filters.formats.join(','),
        filters.regions.join(','),
        filters.licenses.join(','),
        filters.yearFrom,
        filters.yearTo,
      ].join('|'),
    [filters],
  );

  const isDefaultQuery =
    filters.query.trim() === '' && filters.tab === 'all' && activeFilterCount === 0;

  // Camera target: a selected dataset always wins. Otherwise, once the
  // user has actually narrowed the results, fly to wherever they're
  // centred and pick a distance that fits the whole spread on screen.
  const focus = useMemo<CameraFocus | null>(() => {
    if (selected) {
      return focusOnDataset(selected, focusNonce);
    }
    if (isDefaultQuery || results.length === 0) {
      return null;
    }
    return focusOnResults(results, filterSignature);
  }, [selected, focusNonce, isDefaultQuery, results, filterSignature]);

  /* ----------------------------- effects ----------------------------- */
  /* On narrow viewports the sidebar is a drawer, never a column. This
     used to also force the column open every time the viewport widened
     back past the breakpoint (including on the very first render at a
     wide viewport, since a mount counts as `isCompact` "changing" to its
     initial value) — that silently overrode the closed-by-default state
     on any desktop-width load. Only ever force it closed on the way into
     compact; never force it open. */
  useEffect(() => {
    if (isCompact) {
      setSidebarOpen(false);
    } else {
      setDrawerOpen(false);
    }
  }, [isCompact]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* Keep the selection meaningful: drop it when it falls out of the
     current result set. */
  useEffect(() => {
    if (selected && !results.some((d) => d.id === selected.id)) {
      setSelected(null);
    }
  }, [results, selected]);

  /* A cluster listing is only valid for the query that produced it. */
  useEffect(() => setOpenCluster(null), [results]);

  /* ---------------------------- callbacks ---------------------------- */
  const toggleFilterValue = useCallback((key: FilterKey, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  }, []);

  const setYears = useCallback((from: number, to: number) => {
    setFilters((prev) => ({ ...prev, yearFrom: from, yearTo: to }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS(YEAR_MIN, YEAR_MAX));
  }, []);

  const handleSelect = useCallback((dataset: DatasetLocation) => {
    setSelected(dataset);
    setFocusNonce((n) => n + 1);
    setAutoRotate((prev) => (prev ? false : prev));
    /* The details card and the cluster panel both float over the same
       bottom-left corner of the globe — picking a dataset out of a
       cluster's list left the two stacked on top of each other. Opening
       one now always closes the other. */
    setOpenCluster(null);
  }, []);

  const handleUserInteract = useCallback(() => {
    setAutoRotate((prev) => (prev ? false : prev));
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setToast('Geolocation is not available in this browser.');
      return;
    }
    setToast('Locating…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAutoRotate((prev) => (prev ? false : prev));
        cameraHandle.flyTo(
          position.coords.latitude,
          position.coords.longitude,
          2.0,
        );
        setToast('Centred on your current location.');
      },
      () => setToast('Location permission denied — showing the default view.'),
      { timeout: 8000 },
    );
  }, [cameraHandle]);

  const handleReset = useCallback(() => {
    cameraHandle.reset();
    setAutoRotate((prev) => (prev ? false : prev));
  }, [cameraHandle]);

  const handlePan = useCallback(
    (deltaLatitude: number, deltaLongitude: number) => {
      cameraHandle.panBy(deltaLatitude, deltaLongitude);
      setAutoRotate((prev) => (prev ? false : prev));
    },
    [cameraHandle],
  );

  /* ------------------------------ render ----------------------------- */
  const sidebar = (
    <FilterSidebar
      filters={filters}
      facets={facets}
      datasetTotal={datasetTotal}
      catalogueTotal={TOTAL_CATALOGUE_SIZE}
      yearBounds={YEAR_BOUNDS}
      activeFilterCount={activeFilterCount}
      embedded={drawerOpen}
      onToggleValue={toggleFilterValue}
      onYearChange={setYears}
      onReset={resetFilters}
      onClose={drawerOpen ? undefined : () => setSidebarOpen(false)}
    />
  );

  const showSidebarColumn = sidebarOpen && !isCompact && !fullscreen;
  const empty = results.length === 0;

  return (
    <div className={styles.app}>
      <a className="skipLink" href="#main">
        Skip to results
      </a>

      <Header bookmarkCount={bookmarks.length} />

      <div className={styles.commandDock}>
        <SearchBar
          value={filters.query}
          onChange={(query) => setFilters((prev) => ({ ...prev, query }))}
          advancedOpen={isCompact ? drawerOpen : sidebarOpen}
          onToggleAdvanced={() =>
            isCompact ? setDrawerOpen((o) => !o) : setSidebarOpen((o) => !o)
          }
        />

        <SearchTabs
          tab={filters.tab}
          onTabChange={(tab: SearchTab) => setFilters((prev) => ({ ...prev, tab }))}
          counts={tabCounts}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      <div className={styles.canvasBackdrop}>
        <main className={styles.main} id="main">
          {/* Kept mounted on wide viewports so collapsing animates. */}
          {!isCompact && !fullscreen && (
            <div
              className={`${styles.sidebarSlot} ${
                sidebarOpen ? '' : styles.sidebarSlotClosed
              }`}
              aria-hidden={!sidebarOpen}
            >
              {sidebar}
            </div>
          )}

          <section
            className={`${styles.stage} ${fullscreen ? styles.stageFullscreen : ''} ${
              viewMode === 'list' && showSidebarColumn ? styles.stageInset : ''
            }`}
            id="results-region"
            role="tabpanel"
            aria-labelledby={`tab-${filters.tab}`}
          >
          {viewMode === 'globe' ? (
              <div className={styles.globeSlot}>
                <GlobeErrorBoundary>
                  <Suspense fallback={<GlobeFallback />}>
                    <GlobeScene
                      nodes={nodes}
                      selectedLocationId={selected?.id ?? null}
                      autoRotate={autoRotate}
                      reducedMotion={reducedMotion}
                      cameraHandle={cameraHandle}
                      focus={focus}
                      zoomLevel={zoomLevel}
                      locationCount={results.length}
                      datasetCount={datasetTotal}
                      catalogueTotal={TOTAL_CATALOGUE_SIZE}
                      onSelectLocation={handleSelect}
                      onSelectCluster={setOpenCluster}
                      onUserInteract={handleUserInteract}
                      onZoomLevelChange={setZoomLevel}
                    />
                  </Suspense>
                </GlobeErrorBoundary>

                {/* Only offered when the filter column is not already on
                    screen — an edge-mounted tab, not a floating handle. */}
                {!showSidebarColumn && (
                  <button
                    type="button"
                    className={styles.sidebarToggle}
                    onClick={() =>
                      isCompact ? setDrawerOpen(true) : setSidebarOpen(true)
                    }
                  >
                    <Database size={15} aria-hidden="true" />
                    <span className={styles.sidebarToggleLabel}>Datasets</span>
                    {activeFilterCount > 0 && (
                      <span className={styles.filterCount}>
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                )}

                {openCluster && (
                  <ClusterPanel
                    cluster={openCluster}
                    selectedId={selected?.id ?? null}
                    onSelect={handleSelect}
                    onClose={() => setOpenCluster(null)}
                  />
                )}

                <GlobeControls
                  autoRotate={autoRotate}
                  helpVisible={helpVisible}
                  fullscreen={fullscreen}
                  compact={selected !== null}
                  onZoomIn={cameraHandle.zoomIn}
                  onZoomOut={cameraHandle.zoomOut}
                  onReset={handleReset}
                  onLocate={handleLocate}
                  onPan={handlePan}
                  onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
                  onToggleFullscreen={() => setFullscreen((prev) => !prev)}
                  onToggleHelp={setHelpVisible}
                />

                {empty && (
                  <div className={styles.empty}>
                    <div className={styles.emptyCard}>
                      <div className={styles.emptyIcon}>
                        <SearchX size={22} aria-hidden="true" />
                      </div>
                      <h2 className={styles.emptyTitle}>No datasets match</h2>
                      <p className={styles.emptyText}>
                        Nothing in the catalogue matches this combination of
                        search text and filters. Try widening the temporal range
                        or clearing a facet.
                      </p>
                      <button
                        type="button"
                        className={styles.emptyButton}
                        onClick={resetFilters}
                      >
                        Reset all filters
                      </button>
                    </div>
                  </div>
                )}

                {toast && (
                  <div className={styles.toast} role="status">
                    {toast}
                  </div>
                )}
              </div>
          ) : (
            <div className={styles.listSlot}>
              {empty ? (
                <div className={styles.emptyCard} style={{ margin: '0 auto' }}>
                  <div className={styles.emptyIcon}>
                    <SearchX size={22} aria-hidden="true" />
                  </div>
                  <h2 className={styles.emptyTitle}>No datasets match</h2>
                  <p className={styles.emptyText}>
                    Try a different search term, or reset the filters to see the
                    full catalogue again.
                  </p>
                  <button
                    type="button"
                    className={styles.emptyButton}
                    onClick={resetFilters}
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                <DatasetList
                  datasets={results}
                  selectedId={selected?.id ?? null}
                  onSelect={handleSelect}
                />
              )}
            </div>
          )}

            {selected && (
              <div
                className={
                  viewMode === 'globe'
                    ? styles.detailsSlotFloating
                    : styles.detailsSlot
                }
              >
                <DatasetDetailsCard
                  dataset={selected}
                  bookmarked={bookmarks.includes(selected.id)}
                  onToggleBookmark={toggleBookmark}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </section>
        </main>
      </div>

      <section className={styles.below}>
        <div className={styles.belowInner}>
          <div className={styles.welcomeCard}>
            <h2 className={styles.welcomeTitle}>Welcome to ZMT's Data Portal</h2>
            <p className={styles.welcomeText}>
              This is the web frontend of ZMT's Data Portal, where you can find
              metadata and links to research data published by ZMT researchers
              and their partners. Search above, spin the globe to browse by
              place, or narrow the catalogue with the filters. Every record
              links out to its source repository — PANGAEA, Dryad, Zenodo, ENA
              and others — where the files themselves are held. Questions go to{' '}
              <a href="mailto:research-data@leibniz-zmt.de">
                research-data@leibniz-zmt.de
              </a>
              .
            </p>

            <div className={styles.figures}>
              <div className={styles.figure}>
                <AnimatedCounter
                  className={styles.figureValue}
                  value={portalFigures.datasets}
                  formatter={numberFormat}
                />
                <div className={styles.figureLabel}>All datasets</div>
              </div>
              <div className={styles.figure}>
                <AnimatedCounter
                  className={styles.figureValue}
                  value={portalFigures.repositories}
                  formatter={numberFormat}
                />
                <div className={styles.figureLabel}>Repositories</div>
              </div>
              <div className={styles.figure}>
                <AnimatedCounter
                  className={styles.figureValue}
                  value={portalFigures.countries}
                  formatter={numberFormat}
                />
                <div className={styles.figureLabel}>Countries</div>
              </div>
              <div className={styles.figure}>
                <AnimatedCounter
                  className={styles.figureValue}
                  value={portalFigures.locations}
                  formatter={numberFormat}
                />
                <div className={styles.figureLabel}>Locations</div>
              </div>
            </div>

            <div className={styles.repoStrip}>
              {portalFigures.repositoryNames.map((name) => (
                <span key={name} className={styles.repoChip}>
                  {name}
                </span>
              ))}
            </div>
          </div>

          <footer className={styles.footer}>
            <span>
              Leibniz Centre for Tropical Marine Research (ZMT), Bremen
            </span>
            <span className={styles.footerLinks}>
              <a href="#main">Data policy</a>
              <a href="#main">API</a>
              <a href="#main">FAQ</a>
              <a href="#main">Imprint</a>
            </span>
          </footer>
        </div>
      </section>

      <MobileFilterDrawer
        open={drawerOpen}
        resultLabel={`${numberFormat.format(datasetTotal)} datasets`}
        onClose={() => setDrawerOpen(false)}
      >
        {sidebar}
      </MobileFilterDrawer>
    </div>
  );
}

/** Flies right down to the picked dataset's site — that's the point of
 * picking one. `allowClose` waives the framing clamp that otherwise
 * stops filter-driven moves from cropping the globe. `focusNonce` is
 * folded into the key so re-selecting the same dataset re-centres the
 * camera even if the user rotated away since the last time. */
function focusOnDataset(dataset: DatasetLocation, focusNonce: number): CameraFocus {
  return {
    latitude: dataset.latitude,
    longitude: dataset.longitude,
    distance: CLOSE_UP_DISTANCE,
    allowClose: true,
    key: `dataset:${dataset.id}:${focusNonce}`,
  };
}

/** Frames the current filtered results: centres on them, then backs the
 * camera off in proportion to how far they're spread out — a single
 * country zooms in, a global theme pulls back out. */
function focusOnResults(
  results: DatasetLocation[],
  filterSignature: string,
): CameraFocus {
  const centre = geographicCentroid(
    results.map((d) => ({ latitude: d.latitude, longitude: d.longitude })),
  );

  const spreadDeg = results.reduce(
    (max, d) =>
      Math.max(
        max,
        angularDistanceDeg(centre.latitude, centre.longitude, d.latitude, d.longitude),
      ),
    0,
  );

  const distance = Math.min(3.6, Math.max(1.85, 1.85 + (spreadDeg / 90) * 1.75));

  return {
    latitude: centre.latitude,
    longitude: centre.longitude,
    distance,
    key: `filter:${filterSignature}`,
  };
}

function GlobeFallback() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--deep-background)',
        color: '#cfe6f5',
        fontSize: 12.5,
      }}
      role="status"
    >
      Loading globe…
    </div>
  );
}
