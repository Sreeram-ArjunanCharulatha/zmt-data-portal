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

export default function GlobeScene({
  nodes,
  selectedLocationId,
  autoRotate,
  reducedMotion,
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
  } = useFitWordmark(
    'ZMT',
    wordmarkFont,
    700,
    1,
    /* Width is the priority now (edge-to-edge, no side margin) — this
       height ceiling is a last-resort safety cap, not a normal
       constraint, so it's set well above what three capital letters at
       full container width need on any realistic (wider-than-tall)
       globe stage. `.wordmark`'s `overflow: hidden` still protects
       layout if some unusually narrow/tall viewport ever pushes the
       fitted size past it. */
    1.5,
    -0.055,
  );

  return (
    <div className={styles.wrapper}>
      {/* Behind the (transparent-cleared) canvas, not on it: a giant
          watermark the Earth sits in front of and partly occludes,
          without ever competing with the sphere for attention. */}
      <div ref={wordmarkRef} className={styles.wordmark} aria-hidden="true">
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
          ZMT
        </span>
      </div>

      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.01, far: 300, position: [0, 0, 2.8] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          setReady(true);
        }}
      >
        <SceneLighting />

        <Stars
          radius={70}
          depth={45}
          count={reducedMotion ? 1400 : 2600}
          factor={2.9}
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
