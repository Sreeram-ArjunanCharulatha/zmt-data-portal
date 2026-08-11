/* ------------------------------------------------------------------ *
 * Pure spherical geometry — deliberately free of any three.js import so
 * the clustering pipeline (and therefore the main bundle) does not pull
 * the 3D engine in. The engine is loaded only with the globe chunk.
 * ------------------------------------------------------------------ */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/** Unit-sphere Cartesian coordinates for a geographic point. */
export function latLonToUnitVector(
  latitude: number,
  longitude: number,
): [number, number, number] {
  const phi = latitude * DEG2RAD;
  const theta = (longitude - 180) * DEG2RAD;
  return [
    -Math.cos(phi) * Math.cos(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.sin(theta),
  ];
}

/** Inverse of `latLonToUnitVector`. */
export function unitVectorToLatLon(
  x: number,
  y: number,
  z: number,
): { latitude: number; longitude: number } {
  const length = Math.hypot(x, y, z) || 1;
  const latitude = Math.asin(y / length) * RAD2DEG;
  let longitude = Math.atan2(z, -x) * RAD2DEG + 180;
  longitude = ((longitude + 540) % 360) - 180;
  return { latitude, longitude };
}

/** Great-circle distance in degrees between two geographic points. */
export function angularDistanceDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const p1 = lat1 * DEG2RAD;
  const p2 = lat2 * DEG2RAD;
  const dp = (lat2 - lat1) * DEG2RAD;
  const dl = (lon2 - lon1) * DEG2RAD;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))) * RAD2DEG;
}

/**
 * Weighted geographic centroid. Averaging in Cartesian space avoids the
 * antimeridian problem that naive lon/lat averaging suffers from.
 */
export function geographicCentroid(
  points: Array<{ latitude: number; longitude: number; weight?: number }>,
): { latitude: number; longitude: number } {
  let x = 0;
  let y = 0;
  let z = 0;
  let totalWeight = 0;

  for (const point of points) {
    const weight = point.weight ?? 1;
    const [px, py, pz] = latLonToUnitVector(point.latitude, point.longitude);
    x += px * weight;
    y += py * weight;
    z += pz * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0 || (x === 0 && y === 0 && z === 0)) {
    return {
      latitude: points[0]?.latitude ?? 0,
      longitude: points[0]?.longitude ?? 0,
    };
  }

  return unitVectorToLatLon(x, y, z);
}

/** Equirectangular texture coordinates for a geographic point. */
export function lonLatToUv(latitude: number, longitude: number) {
  return {
    u: (longitude + 180) / 360,
    v: (latitude + 90) / 180,
  };
}
