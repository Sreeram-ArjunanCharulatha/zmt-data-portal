import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ClusterNode } from '../../types/dataset';
import { DatasetCluster } from '../DatasetCluster/DatasetCluster';
import { DatasetMarker } from '../DatasetMarker/DatasetMarker';
import type { NodeRegistration } from './SpriteNode';

const REFERENCE_DISTANCE = 2.6;
/** Canvas height, in px, that marker sizing is normalised against — see
 *  `viewportScale`. Set so the windowed stage (~694px at 1440x900) keeps
 *  the marker size it had before sizing was made height-independent. */
const MARKER_REFERENCE_HEIGHT = 634;
const DECLUTTER_INTERVAL = 0.14;
/** Minimum time a sprite must hold its declutter state before it's
 * allowed to flip again. The screen-space hysteresis below only guards
 * against sub-pixel jitter at a *fixed* camera — during auto-rotate the
 * globe is genuinely turning, so two markers sitting near the overlap
 * threshold can drift across it and back on consecutive 140ms passes,
 * which reads as a soft on/off flicker even though nothing is actually
 * wrong. This cooldown stops a sprite from re-flipping within it. */
const MIN_STATE_DWELL = 0.5;

type GlobeNodesProps = {
  nodes: ClusterNode[];
  selectedLocationId: string | null;
  onActivate: (node: ClusterNode) => void;
  /** How many markers are actually on screen right now (facing the
      camera, not hidden behind a bigger neighbour). Throttled. */
  onVisibleCountChange?: (count: number) => void;
};

const VISIBLE_COUNT_INTERVAL = 0.2;

/**
 * Owns the single per-frame loop for every marker and cluster:
 *  - hides nodes on the far side of the globe (with a soft limb fade)
 *  - keeps apparent marker size constant while zooming
 *  - animates hover / selection scale
 *  - suppresses overlapping nodes using a throttled screen-space pass
 */
export function GlobeNodes({
  nodes,
  selectedLocationId,
  onActivate,
  onVisibleCountChange,
}: GlobeNodesProps) {
  const registry = useRef(new Map<string, NodeRegistration>());
  const declutterClock = useRef(0);
  const visibleCountClock = useRef(0);
  const lastReportedVisible = useRef(-1);
  const projected = useRef(new THREE.Vector3());
  /* Bumped whenever nodes are added or removed, so the overlap pass can
     run on the very next frame instead of up to 140 ms later — that lag
     is what made re-clustering flicker. */
  const registryVersion = useRef(0);
  const declutteredVersion = useRef(-1);

  const register = useCallback(
    (id: string, registration: NodeRegistration | null) => {
      if (registration) registry.current.set(id, registration);
      else registry.current.delete(id);
      registryVersion.current += 1;
    },
    [],
  );

  /** Screen-space overlap pass: hides whichever sprites are crowded out
   * by a bigger or already-visible neighbour. Runs on a throttle (not
   * every frame — projecting every sprite to screen space isn't free)
   * but also whenever the registered node set has actually changed, so
   * a re-cluster doesn't wait out the rest of the throttle window. */
  function updateDeclutter(
    entries: NodeRegistration[],
    camera: THREE.Camera,
    size: { width: number; height: number },
    delta: number,
    elapsedTime: number,
  ) {
    declutterClock.current += delta;
    const nodesChanged = declutteredVersion.current !== registryVersion.current;
    if (!nodesChanged && declutterClock.current < DECLUTTER_INTERVAL) return;

    declutterClock.current = 0;
    declutteredVersion.current = registryVersion.current;

    // Biggest / selected clusters claim their screen space first, so a
    // large cluster never gets hidden behind a small one drawn later.
    const byPriority = [...entries].sort((a, b) => {
      const aSelected = a.sprite.userData.selected ? 1 : 0;
      const bSelected = b.sprite.userData.selected ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return b.node.datasetCount - a.node.datasetCount;
    });

    const kept: Array<{ x: number; y: number; r: number }> = [];
    for (const entry of byPriority) {
      const { sprite } = entry;

      /* Skip anything behind the horizon. Sprites on the far side of the
         globe still project to a screen position — often right on top of
         a front-facing one — so without this they claimed screen space
         and suppressed markers the user can actually see. Because the
         priority sort runs biggest-first, a large cluster hidden round
         the back would silently hide a smaller visible neighbour, and as
         the globe auto-rotated those back-side sprites swept through and
         knocked out front markers for a second or two at a time. */
      if (sprite.position.dot(camera.position) - 1 <= 0) {
        sprite.userData.declutterHidden = false;
        continue;
      }

      projected.current.copy(sprite.position).project(camera);
      const x = (projected.current.x * 0.5 + 0.5) * size.width;
      const y = (-projected.current.y * 0.5 + 0.5) * size.height;
      const r = entry.screenRadius;

      const wasHidden = sprite.userData.declutterHidden === true;

      // Hysteresis: a sprite that was already visible needs a clearly
      // tighter overlap before it's hidden than a hidden one needs to
      // reappear. Without this, pairs sitting right at the overlap
      // threshold flicker in and out every pass from sub-pixel jitter
      // in the projected position alone.
      const hysteresis = wasHidden ? 1 : 0.65;
      const overlapsKept = kept.some((other) => {
        const dx = x - other.x;
        const dy = y - other.y;
        // Measured against the solid disc, not the glow halo the
        // sprite texture also contains — otherwise bigger markers
        // would silently suppress most of their neighbours.
        const minGap = (r + other.r) * 0.4 * hysteresis;
        return dx * dx + dy * dy < minGap * minGap;
      });

      const changedSincePass = overlapsKept !== wasHidden;
      const lastChangedAt = (sprite.userData.declutterChangedAt as number) ?? -Infinity;
      const tooSoonToFlip = elapsedTime - lastChangedAt < MIN_STATE_DWELL;
      const isHidden = changedSincePass && tooSoonToFlip ? wasHidden : overlapsKept;

      if (isHidden !== wasHidden) {
        sprite.userData.declutterChangedAt = elapsedTime;
      }
      sprite.userData.declutterHidden = isHidden;
      if (!isHidden) kept.push({ x, y, r });
    }
  }

  /** Per-sprite visibility, fade and scale: fades sprites out past the
   * horizon, cross-fades declutter-hidden ones instead of snapping them,
   * pulses the selected marker, and keeps apparent size roughly constant
   * regardless of camera distance or viewport size. */
  function updateNodeAppearance(
    entry: NodeRegistration,
    camera: THREE.Camera,
    size: { width: number; height: number },
    cameraDistance: number,
    delta: number,
    elapsedTime: number,
  ) {
    const { sprite } = entry;
    const material = sprite.material as THREE.SpriteMaterial;

    // Horizon test: a sprite is on the far side of the globe once its
    // position no longer faces the camera.
    const facing = sprite.position.dot(camera.position) - 1;
    const fade = THREE.MathUtils.clamp(facing / (0.12 * cameraDistance), 0, 1);
    const hidden = sprite.userData.declutterHidden === true;
    const targetOpacity = hidden ? 0 : fade;
    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      targetOpacity,
      1 - Math.exp(-Math.min(delta, 0.05) * 11),
    );
    sprite.visible = material.opacity > 0.015;

    const baseScale = (sprite.userData.baseScale as number) ?? 0.12;
    const selected = sprite.userData.selected === true;
    // The selected marker breathes gently so the eye can find it again
    // after rotating away — subtle on purpose, a beacon not an alarm.
    // Hover no longer changes scale: info only appears on click now, so
    // nothing should react to mouse proximity alone.
    const selectedPulse = 1.16 + Math.sin(elapsedTime * 2.4) * 0.07;
    const emphasis = selected ? selectedPulse : 1;
    /* Cancel the canvas height out of the sprite's *screen* size.
       A sprite projects to roughly `worldSize / distance × canvasHeight`
       pixels, and the `pointDistance` factor below already cancels the
       distance term — which leaves pixel size directly proportional to
       canvas height. Fullscreen's canvas is about a quarter taller than
       the windowed stage, so markers came out visibly bigger there even
       though the globe itself is now the same size in both views. The
       old form (`size.height / 760`) scaled the same way as the height
       rather than against it, compounding the difference instead of
       removing it.
       `MARKER_REFERENCE_HEIGHT` is chosen so the windowed view keeps
       exactly the size it already had; every other viewport now matches
       it. The clamp still lets markers shrink slightly on very short
       viewports so they never swamp the globe. */
    const viewportScale = THREE.MathUtils.clamp(
      MARKER_REFERENCE_HEIGHT / size.height,
      0.5,
      1.15,
    );
    const pointDistance = camera.position.distanceTo(sprite.position);
    const targetScale =
      baseScale * (pointDistance / REFERENCE_DISTANCE) * emphasis * viewportScale;

    if (sprite.userData.needsScaleInit) {
      sprite.userData.needsScaleInit = false;
      sprite.scale.set(targetScale, targetScale, 1);
    } else {
      const nextScale = THREE.MathUtils.lerp(
        sprite.scale.x || targetScale,
        targetScale,
        1 - Math.exp(-Math.min(delta, 0.05) * 14),
      );
      sprite.scale.set(nextScale, nextScale, 1);
    }
  }

  /** Reports how many sprites are actually on screen right now, at most
   * every `VISIBLE_COUNT_INTERVAL` seconds and only when the count
   * changed — this feeds a UI readout, so there's no reason to re-render
   * React on every frame just to report the same number. */
  function reportVisibleCount(entries: NodeRegistration[], delta: number) {
    if (!onVisibleCountChange) return;

    visibleCountClock.current += delta;
    if (visibleCountClock.current < VISIBLE_COUNT_INTERVAL) return;
    visibleCountClock.current = 0;

    const visibleNow = entries.reduce(
      (count, entry) => count + (entry.sprite.visible ? 1 : 0),
      0,
    );
    if (visibleNow !== lastReportedVisible.current) {
      lastReportedVisible.current = visibleNow;
      onVisibleCountChange(visibleNow);
    }
  }

  useFrame((state, delta) => {
    const { camera, size } = state;
    const entries = [...registry.current.values()];
    const cameraDistance = camera.position.length();

    updateDeclutter(entries, camera, size, delta, state.clock.elapsedTime);
    for (const entry of entries) {
      updateNodeAppearance(entry, camera, size, cameraDistance, delta, state.clock.elapsedTime);
    }
    reportVisibleCount(entries, delta);
  });

  return (
    <group>
      {nodes.map((node) =>
        node.isCluster ? (
          <DatasetCluster
            key={node.id}
            node={node}
            selected={false}
            onActivate={onActivate}
            register={register}
          />
        ) : (
          <DatasetMarker
            key={node.id}
            node={node}
            selected={node.location?.id === selectedLocationId}
            onActivate={onActivate}
            register={register}
          />
        ),
      )}
    </group>
  );
}
