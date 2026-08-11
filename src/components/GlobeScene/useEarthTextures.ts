import { useEffect, useState } from 'react';
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Photographic Earth maps.
 *
 * These are real equirectangular satellite textures served from
 * /public/textures (see textures/README.md). They are loaded *after*
 * first paint and swapped in over the procedurally drawn globe, so the
 * scene is interactive immediately and simply gets sharper — no blank
 * canvas while ~2 MB of imagery arrives.
 * ------------------------------------------------------------------ */

export type EarthTextures = {
  day: THREE.Texture;
  clouds: THREE.Texture;
};

/* Only the two colour plates are used. The pack's normal and specular
   maps are for a lit material; the globe renders the artwork unlit, so
   fetching them would be pure waste. */
const SOURCES = {
  day: '/textures/earth-day.jpg',
  clouds: '/textures/earth-clouds.jpg',
} as const;

/** Module-level cache: switching map styles must not re-download. */
let cache: EarthTextures | null = null;
let pending: Promise<EarthTextures> | null = null;

function load(): Promise<EarthTextures> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  const loader = new THREE.TextureLoader();

  const loadOne = (url: string, colorSpace: THREE.ColorSpace) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = colorSpace;
          texture.anisotropy = 8;
          /* Equirectangular maps wrap horizontally, clamp vertically. */
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          resolve(texture);
        },
        undefined,
        reject,
      );
    });

  pending = Promise.all([
    loadOne(SOURCES.day, THREE.SRGBColorSpace),
    loadOne(SOURCES.clouds, THREE.SRGBColorSpace),
  ]).then(([day, clouds]) => {
    cache = { day, clouds };
    pending = null;
    return cache;
  });

  return pending;
}

/**
 * Returns the photographic maps once they have downloaded, or `null`
 * while they are still in flight (or if they failed, in which case the
 * procedural globe simply stays on screen).
 */
export function useEarthTextures(enabled: boolean): EarthTextures | null {
  const [textures, setTextures] = useState<EarthTextures | null>(cache);

  useEffect(() => {
    if (!enabled || textures) return;

    let cancelled = false;
    load()
      .then((loaded) => {
        if (!cancelled) setTextures(loaded);
      })
      .catch((error) => {
        console.warn('Earth imagery unavailable, using the drawn globe', error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, textures]);

  return enabled ? textures : null;
}

/** Frees the shared imagery. Called when the scene unmounts. */
export function disposeEarthTextures() {
  if (!cache) return;
  Object.values(cache).forEach((texture) => texture.dispose());
  cache = null;
}
