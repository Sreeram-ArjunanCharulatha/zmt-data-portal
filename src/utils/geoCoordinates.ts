import * as THREE from 'three';
import { latLonToUnitVector, unitVectorToLatLon } from './geoMath';

/* ------------------------------------------------------------------ *
 * three.js bindings for the pure helpers in `geoMath`.
 *
 * Convention: the earth mesh is a THREE.SphereGeometry with the default
 * `phiStart = 0`, textured with an equirectangular image whose left edge
 * is longitude -180. `latLonToVector3` and `lonLatToUv` are the matching
 * pair, so a marker lands exactly on the pixel the texture would sample.
 * ------------------------------------------------------------------ */

export { angularDistanceDeg, geographicCentroid, lonLatToUv } from './geoMath';
export { DEG2RAD, RAD2DEG } from './geoMath';

export const GLOBE_RADIUS = 1;

/** Position on (or above) the sphere for a geographic coordinate. */
export function latLonToVector3(
  latitude: number,
  longitude: number,
  radius: number = GLOBE_RADIUS,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const [x, y, z] = latLonToUnitVector(latitude, longitude);
  return target.set(x * radius, y * radius, z * radius);
}

/** Inverse of `latLonToVector3`. */
export function vector3ToLatLon(v: THREE.Vector3): {
  latitude: number;
  longitude: number;
} {
  return unitVectorToLatLon(v.x, v.y, v.z);
}
