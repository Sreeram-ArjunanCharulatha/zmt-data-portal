import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { ClusterNode, DatasetLocation } from '../../types/dataset';
import type { GlobeCameraHandle } from '../../hooks/useGlobeCamera';
import { disposeGeneratedTextures } from '../../utils/earthTexture';
import { vector3ToLatLon } from '../../utils/geoCoordinates';
import { angularDistanceDeg } from '../../utils/geoMath';
import { MIN_CAMERA_DISTANCE } from '../../utils/clustering';
import { Atmosphere } from './Atmosphere';
import { CameraRig, type CameraFocus } from './CameraRig';
import { CountryBorders } from './CountryBorders';
import { Earth } from './Earth';
import { GlobeNodes } from './GlobeNodes';
import { PlaceLabels } from './PlaceLabels';
import { SceneLighting } from './SceneLighting';
import { disposeEarthTextures } from './useEarthTextures';
import { useFitWordmark } from './useFitWordmark';
import styles from './GlobeScene.module.css';

type GlobeSceneProps = {
  nodes: ClusterNode[];
  selectedLocationId: string | null;
  autoRotate: boolean;
  reducedMotion: boolean;
  /** Fullscreen swaps the pale page background for deep space, so the
   *  starfield has to be dense/bright enough to actually read there. */
  fullscreen: boolean;
  cameraHandle: GlobeCameraHandle;
  focus: CameraFocus | null;
  zoomLevel: number;
  locationCount: number;
  datasetCount: number;
  catalogueTotal: number;
  onSelectLocation: (location: DatasetLocation) => void;
  onSelectCluster: (cluster: ClusterNode) => void;
  onUserInteract: () => void;
  onZoomLevelChange: (level: number) => void;
};

/** The watermark behind the globe. Split per-glyph when rendered, so it
 *  lives here rather than inline in two places. */
const WORDMARK_TEXT = 'ZMT';

export default function GlobeScene({
  nodes,
  selectedLocationId,
  autoRotate,
  reducedMotion,
  fullscreen,
  cameraHandle,
  focus,
  zoomLevel,
  locationCount,
  datasetCount,
  catalogueTotal,
  onSelectLocation,
  onSelectCluster,
  onUserInteract,
  onZoomLevelChange,
}: GlobeSceneProps) {
  const [ready, setReady] = useState(false);
  /* Distinct from `nodes.length`: this is how many of those markers are
     actually on screen right now, after horizon culling and the
     screen-space overlap pass — updates live as the camera moves. */
  const [visibleCount, setVisibleCount] = useState(nodes.length);

  useEffect(() => setVisibleCount(nodes.length), [nodes]);

  useEffect(
    () => () => {
      disposeGeneratedTextures();
      disposeEarthTextures();
    },
    [],
  );

  const handleActivate = useCallback(
    (node: ClusterNode) => {
      onUserInteract();
      const distance = cameraHandle.apiRef.current?.getDistance() ?? 2.6;

      if (node.isCluster) {
        /* Two things at once: fly towards the group and list its
           members, so the badge's number is immediately accountable.
           The zoom-in distance used to be a flat 0.74x of wherever the
           camera already was, regardless of how tightly the cluster's
           own members are grouped — for a widely spread cluster that
           routinely overshot into a much closer zoom level, shattering
           it into a scatter of small sub-clusters while the panel kept
           showing the original (now stale-looking) total. Capping the
           zoom to how far the members actually spread means a tight
           cluster still zooms in the full 0.74x, but a loose one stops
           at a distance that comfortably frames it without needlessly
           crossing another clustering threshold. */
        const spreadDeg = node.members.reduce(
          (max, member) =>
            Math.max(
              max,
              angularDistanceDeg(
                node.latitude,
                node.longitude,
                member.latitude,
                member.longitude,
              ),
            ),
          0,
        );
        const spreadDistance = MIN_CAMERA_DISTANCE * 1.1 + (spreadDeg / 45) * 1.3;
        const targetDistance = Math.max(
          MIN_CAMERA_DISTANCE * 1.05,
          Math.min(distance * 0.74, spreadDistance),
        );

        onSelectCluster(node);
        cameraHandle.flyTo(node.latitude, node.longitude, targetDistance);
        return;
      }

      /* Selecting drives `focus`, which the camera rig animates to. */
      if (node.location) onSelectLocation(node.location);
    },
    [cameraHandle, onSelectLocation, onSelectCluster, onUserInteract],
  );

  const handleSurfaceDoubleClick = useCallback(
    (point: THREE.Vector3) => {
      const { latitude, longitude } = vector3ToLatLon(point);
      onUserInteract();
      const distance = cameraHandle.apiRef.current?.getDistance() ?? 2.6;
      cameraHandle.flyTo(latitude, longitude, distance * 0.8);
    },
    [cameraHandle, onUserInteract],
  );

  const numberFormat = useMemo(() => new Intl.NumberFormat('en-US'), []);

  /* Resolve the design token at runtime rather than hard-coding the font
     stack a second time, so the measurement always matches what actually
     paints. Measured, not guessed — see useFitWordmark for why. */
  const wordmarkFont = useMemo(() => {
    if (typeof window === 'undefined') return 'sans-serif';
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--font-wordmark')
        .trim() || 'sans-serif'
    );
  }, []);
  const {
    containerRef: wordmarkRef,
    fontSize: wordmarkSize,
    centerOffsetEm: wordmarkOffsetEm,
    letterOffsetsEm: wordmarkLetterOffsets,
  } = useFitWordmark(
    WORDMARK_TEXT,
    wordmarkFont,
    700,
    /* Just under full width, so the mark has a little air either side
       rather than running edge to edge. */
    0.9,
    /* This height ceiling is a last-resort safety cap, not a normal
       constraint, so it's set well above what three capital letters at
       full container width need on any realistic (wider-than-tall)
       globe stage. `.wordmark`'s `overflow: hidden` still protects
       layout if some unusually narrow/tall viewport ever pushes the
       fitted size past it. */
    1.5,
    -0.055,
    /* Centred: equal air before the "Z" and after the "T". `solveShiftEm`
       is still wired up if the mark ever needs nudging off-centre, but
       the ink-centring correction in `solveCenterOffsetEm` is what
       actually does the work here — the "Z" and "T" carry different side
       bearings, so centring the type box alone leaves the visible
       letters looking lopsided. */
    0,
  );

  return (
    <div className={styles.wrapper}>
      {/* Behind the (transparent-cleared) canvas, not on it: a giant
          watermark the Earth sits in front of and partly occludes,
          without ever competing with the sphere for attention.

          Dropped entirely in fullscreen. Its `soft-light` blend is tuned
          against the blue workspace; over the fullscreen black the same
          settings render a much heavier grey, and fullscreen is meant to
          be the undecorated view of the globe in space. Still mounted
          (not merely hidden) so `useFitWordmark`'s ResizeObserver keeps
          measuring — the mark is sized correctly the moment fullscreen
          exits, rather than flashing at a stale size. */}
      <div
        ref={wordmarkRef}
        className={`${styles.wordmark} ${
          fullscreen ? styles.wordmarkHidden : ''
        }`}
        aria-hidden="true"
      >
        <span
          className={styles.wordmarkText}
          style={
            wordmarkSize
              ? {
                  fontSize: wordmarkSize,
                  /* Recentres on the glyphs' own ink (see
                     useFitWordmark) rather than their advance box, so
                     asymmetric side bearing on "Z" vs "T" in whatever
                     font actually resolved doesn't read as off-centre. */
                  transform: `translateX(${wordmarkOffsetEm}em)`,
                }
              : undefined
          }
        >
          {/* One span per glyph so each can carry its own optical-kerning
              nudge from useFitWordmark. `transform` rather than margin:
              it shifts the glyph without touching layout, so the advance
              box the size and centring were solved against stays exactly
              as measured. */}
          {[...WORDMARK_TEXT].map((char, index) => (
            <span
              key={`${char}-${index}`}
              style={{
                display: 'inline-block',
                transform: `translateX(${wordmarkLetterOffsets[index] ?? 0}em)`,
              }}
            >
              {char}
            </span>
          ))}
        </span>
      </div>

      <Canvas
        className={styles.canvas}
        /* Overrides R3F's own inline `touch-action: none` on this
           container, which handed every touch gesture to OrbitControls:
           a vertical swipe anywhere over the (full-bleed) canvas rotated
           the globe instead of scrolling, so on a phone the page was
           simply stuck at the globe. It has to be set here rather than
           in the stylesheet — inline styles win, so the CSS rule looked
           correct and did nothing.
           `pan-y` returns vertical swipes to the document while
           horizontal drags still rotate the globe. Trade-off: touch
           users tilt with the dock's controls rather than a vertical
           drag; pinch-zoom is unaffected. */
        style={{ touchAction: 'pan-y' }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.01, far: 300, position: [0, 0, 2.8] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          setReady(true);
        }}
      >
        <SceneLighting />

        {/* Denser and a touch larger in fullscreen. On the pale page
            background the starfield is only a faint texture, and pushing
            it further there would read as noise over a light gradient —
            but against the fullscreen black it *is* the sky, and at the
            windowed values it all but disappeared. */}
        <Stars
          radius={70}
          depth={45}
          count={
            reducedMotion
              ? 1400
              : fullscreen
                ? 6000
                : 2600
          }
          factor={fullscreen ? 4.2 : 2.9}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.15}
        />

        <Earth
          showClouds
          reducedMotion={reducedMotion}
          onSurfaceDoubleClick={handleSurfaceDoubleClick}
        />
        <Atmosphere />
        <CountryBorders zoomLevel={zoomLevel} />
        <PlaceLabels zoomLevel={zoomLevel} />

        <GlobeNodes
          nodes={nodes}
          selectedLocationId={selectedLocationId}
          onActivate={handleActivate}
          onVisibleCountChange={setVisibleCount}
        />

        <CameraRig
          apiRef={cameraHandle.apiRef}
          autoRotate={autoRotate}
          reducedMotion={reducedMotion}
          focus={focus}
          onUserInteract={onUserInteract}
          onZoomLevelChange={onZoomLevelChange}
        />
      </Canvas>

      {/* One compact capsule, not three separate cards — lighter and
          smaller than the control dock so it reads as a status line. */}
      <div className={styles.stats} aria-live="polite">
        <div className={styles.statGroup}>
          <span className={styles.statValue}>
            {numberFormat.format(datasetCount)}
            <span className={styles.statValueMuted}>
              /{numberFormat.format(catalogueTotal)}
            </span>
          </span>
          <span className={styles.statLabel}>Mapped / Catalogue</span>
        </div>
        <span className={styles.statDivider} aria-hidden="true" />
        <div className={styles.statGroup}>
          <span className={styles.statValue}>{nodes.length}</span>
          <span className={styles.statLabel}>Markers</span>
        </div>
        <span className={styles.statDivider} aria-hidden="true" />
        <div className={styles.statGroup}>
          <span className={styles.statValue}>
            {Math.min(visibleCount, locationCount)}
          </span>
          <span className={styles.statLabel}>Currently visible</span>
        </div>
      </div>

      {!ready && (
        <div className={styles.loading} role="status">
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Preparing globe…</span>
        </div>
      )}
    </div>
  );
}
