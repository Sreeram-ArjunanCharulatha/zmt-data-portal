import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ClusterNode } from '../../types/dataset';
import { TIER_STYLE, clusterTier } from '../../utils/clustering';
import { createNodeSprite } from '../../utils/earthTexture';
import { latLonToVector3 } from '../../utils/geoCoordinates';

/** Markers float just above the surface so they read as pins, not decals. */
export const MARKER_ALTITUDE = 1.022;

export type NodeRegistration = {
  sprite: THREE.Sprite;
  node: ClusterNode;
  screenRadius: number;
};

export type SpriteNodeProps = {
  node: ClusterNode;
  label: string;
  selected: boolean;
  isCluster: boolean;
  onActivate: (node: ClusterNode) => void;
  register: (id: string, registration: NodeRegistration | null) => void;
};

/**
 * A single billboarded node on the globe. Sprites always face the camera
 * by construction, so no per-frame lookAt is needed here — the parent
 * `GlobeNodes` loop owns scaling, fading and screen-space declutter.
 */
export function SpriteNode({
  node,
  label,
  selected,
  isCluster,
  onActivate,
  register,
}: SpriteNodeProps) {
  const ref = useRef<THREE.Sprite>(null);

  const tier = clusterTier(node.datasetCount);
  const style = TIER_STYLE[tier];

  const position = useMemo(
    () => latLonToVector3(node.latitude, node.longitude, MARKER_ALTITUDE),
    [node.latitude, node.longitude],
  );

  const texture = useMemo(
    () =>
      createNodeSprite({
        label,
        fill: style.fill,
        ring: style.ring,
        text: style.text,
        selected,
        isCluster,
      }),
    [label, style.fill, style.ring, style.text, selected, isCluster],
  );

  const baseScale = style.radiusPx / 190;

  /* Layout effect, not a passive effect: a passive effect runs *after*
     the browser paints, so the sprite would be shown once at three.js's
     default scale of 1 — many times too large — before being corrected.
     That single frame is the "cluster appears zoomed then snaps back"
     flash when re-clustering during a zoom. */
  useLayoutEffect(() => {
    const sprite = ref.current;
    if (!sprite) return;
    const base = baseScale;
    sprite.userData.baseScale = base;
    sprite.userData.selected = selected;
    /* Sprites default to scale 1 — roughly eight times too big. Flag the
       first frame so the parent snaps to the right size instead of
       animating down from it, which reads as a flicker on every
       re-cluster. */
    sprite.scale.set(base, base, 1);
    sprite.userData.needsScaleInit = true;
    /* Start invisible; the parent loop fades it in. */
    (sprite.material as THREE.SpriteMaterial).opacity = 0;
    register(node.id, {
      sprite,
      node,
      screenRadius: style.radiusPx,
    });
    return () => register(node.id, null);
  }, [node, register, baseScale, style.radiusPx, isCluster, selected]);

  const stop = (event: ThreeEvent<PointerEvent>) => event.stopPropagation();

  return (
    <sprite
      ref={ref}
      position={position}
      /* Correct size and zero opacity from the very first frame. */
      scale={[baseScale, baseScale, 1]}
      renderOrder={isCluster ? 12 : 10}
      onPointerOver={(event) => {
        stop(event);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(event) => {
        stop(event);
        document.body.style.cursor = '';
      }}
      onClick={(event) => {
        event.stopPropagation();
        onActivate(node);
      }}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        sizeAttenuation
      />
    </sprite>
  );
}
