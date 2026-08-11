import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import borders from '../../data/countryBorders.json';
import { latLonToVector3 } from '../../utils/geoCoordinates';

/* ------------------------------------------------------------------ *
 * International boundaries, the detail that makes a globe read as a
 * map rather than a photograph of a ball.
 *
 * Source: Natural Earth 1:110m admin-0 boundary lines, reduced to bare
 * coordinate arrays (see src/data/countryBorders.json).
 * ------------------------------------------------------------------ */

/** Lines sit just above the surface to avoid z-fighting with it. */
const BORDER_ALTITUDE = 1.0015;

/**
 * Natural Earth stores long straight spans as two endpoints. Drawn
 * directly those would cut *through* the sphere, so every span longer
 * than this is subdivided along the great circle.
 */
const MAX_SEGMENT_DEG = 1.5;

type BorderData = { lines: Array<Array<[number, number]>> };

function buildGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const point = new THREE.Vector3();

  const push = (v: THREE.Vector3) => positions.push(v.x, v.y, v.z);

  for (const line of (borders as BorderData).lines) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];

      /* Skip spans that wrap the antimeridian — they would draw a stripe
         straight across the globe. */
      if (Math.abs(lon2 - lon1) > 180) continue;

      latLonToVector3(lat1, lon1, BORDER_ALTITUDE, from);
      latLonToVector3(lat2, lon2, BORDER_ALTITUDE, to);

      const spanDeg = Math.max(Math.abs(lat2 - lat1), Math.abs(lon2 - lon1));
      const steps = Math.max(1, Math.ceil(spanDeg / MAX_SEGMENT_DEG));

      let previous = from.clone();
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        /* Spherical interpolation keeps the line on the surface. */
        point.copy(from).lerp(to, t).setLength(BORDER_ALTITUDE);
        push(previous);
        push(point);
        previous = point.clone();
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}

type CountryBordersProps = {
  /** 0 = whole globe, 6 = closest. Borders firm up as you approach. */
  zoomLevel: number;
};

export function CountryBorders({ zoomLevel }: CountryBordersProps) {
  const geometry = useMemo(buildGeometry, []);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#eaf4fb',
        transparent: true,
        opacity: 0.3,
        /* Depth-tested so the sphere hides boundaries on the far side,
           but never writing depth so markers stay on top. */
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    material.opacity = zoomLevel >= 4 ? 0.5 : zoomLevel >= 2 ? 0.4 : 0.28;
  }, [material, zoomLevel]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <lineSegments
      geometry={geometry}
      material={material}
      renderOrder={4}
      raycast={() => null}
    />
  );
}
