import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ClusterNode } from '../../types/dataset';
import { DatasetCluster } from '../DatasetCluster/DatasetCluster';
import { DatasetMarker } from '../DatasetMarker/DatasetMarker';
import type { NodeRegistration } from './SpriteNode';

const REFERENCE_DISTANCE = 2.6;
/** Normalises marker size against canvas height. Set so the windowed
 *  stage keeps the size it already had. */
const MARKER_REFERENCE_HEIGHT = 634;
const DECLUTTER_INTERVAL = 0.14;
/** Cooldown before a sprite may flip state again. Hysteresis alone only
 *  covers jitter at a fixed camera; while auto-rotating, markers drift
 *  across the threshold and back and it reads as flicker. */
const MIN_STATE_DWELL = 0.5;

type GlobeNodesProps = {
  nodes: ClusterNode[];
  selectedLocationId: string | null;
  onActivate: (node: ClusterNode) => void;
  /** Markers actually on screen — facing the camera and not hidden.
      Throttled. */
  onVisibleCountChange?: (count: number) => void;
};

const VISIBLE_COUNT_INTERVAL = 0.2;

/**
 * One per-frame loop for every marker and cluster: limb fade, constant
 * apparent size, selection pulse, and overlap suppression.
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
  // Bumped on add/remove so the overlap pass runs next frame rather
  // than up to 140ms later, which made re-clustering flicker.
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

  /** Hides sprites crowded out by a bigger neighbour. Throttled, since
   *  projecting everything each frame isn't free — but runs immediately
   *  when the node set changes so a re-cluster isn't delayed. */
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

      // Skip anything behind the horizon. Back-facing sprites still
      // project onto the visible face, so they were claiming space and
      // hiding markers you can actually see.
      if (sprite.position.dot(camera.position) - 1 <= 0) {
        sprite.userData.declutterHidden = false;
        continue;
      }

      projected.current.copy(sprite.position).project(camera);
      const x = (projected.current.x * 0.5 + 0.5) * size.width;
      const y = (-projected.current.y * 0.5 + 0.5) * size.height;
      const r = entry.screenRadius;

      const wasHidden = sprite.userData.declutterHidden === true;

      // Hysteresis — a visible sprite needs a tighter overlap to be
      // hidden than a hidden one needs to reappear, or pairs sitting on
      // the threshold flicker every pass.
      const hysteresis = wasHidden ? 1 : 0.65;
      const overlapsKept = kept.some((other) => {
        const dx = x - other.x;
        const dy = y - other.y;
        // Against the solid disc, not the glow, or big markers
        // suppress most of their neighbours.
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

  /** Per-sprite fade, scale and visibility. */
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

    // Far side of the globe once it stops facing the camera.
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
    // Gentle breathe so you can find the selection after rotating away.
    const selectedPulse = 1.16 + Math.sin(elapsedTime * 2.4) * 0.07;
    const emphasis = selected ? selectedPulse : 1;
    // Cancel canvas height out of the screen size. A sprite projects to
    // ~worldSize / distance * canvasHeight, and pointDistance below
    // already handles distance — so pixel size tracked canvas height and
    // markers grew in fullscreen.
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
