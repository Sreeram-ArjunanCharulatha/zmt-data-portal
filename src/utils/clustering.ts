import type { ClusterNode, ClusterTier, DatasetLocation } from '../types/dataset';
import { angularDistanceDeg, geographicCentroid } from './geoMath';

// Groups nearby locations on the sphere so the globe doesn't drown in
// markers when zoomed out. Clustering is recomputed from scratch every
// time it's called (whatever locations survive the current filters, at
// whatever threshold the current zoom level implies) rather than
// maintained incrementally — the input sets are small enough that this
// stays cheap, and it avoids an entire class of "stale cluster" bugs.

/** Walks the sorted locations once, folding each unclaimed point into a
 * new group along with every other unclaimed point within `thresholdDeg`
 * of it. Sorting by id first (rather than clustering in whatever order
 * the caller passed them) keeps group membership — and therefore which
 * point becomes the group's "seed" — stable across re-renders. */
export function clusterLocations(
  locations: DatasetLocation[],
  thresholdDeg: number,
): ClusterNode[] {
  if (locations.length === 0) return [];
  if (thresholdDeg <= 0) return locations.map(toSingleNode);

  const sorted = [...locations].sort((a, b) => a.id.localeCompare(b.id));
  const claimed = new Set<string>();
  const groups: DatasetLocation[][] = [];

  for (const seed of sorted) {
    if (claimed.has(seed.id)) continue;

    const group = [seed];
    claimed.add(seed.id);

    for (const other of sorted) {
      if (claimed.has(other.id)) continue;
      const distanceDeg = angularDistanceDeg(
        seed.latitude,
        seed.longitude,
        other.latitude,
        other.longitude,
      );
      if (distanceDeg <= thresholdDeg) {
        group.push(other);
        claimed.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups.map(toNode);
}

function toSingleNode(location: DatasetLocation): ClusterNode {
  return {
    id: `single-${location.id}`,
    latitude: location.latitude,
    longitude: location.longitude,
    datasetCount: 1,
    members: [location],
    isCluster: false,
    location,
  };
}

function toNode(group: DatasetLocation[]): ClusterNode {
  if (group.length === 1) return toSingleNode(group[0]);

  const centroid = geographicCentroid(
    group.map((g) => ({ latitude: g.latitude, longitude: g.longitude })),
  );

  const members = [...group].sort((a, b) => a.title.localeCompare(b.title));

  return {
    // Built from sorted member ids, not e.g. the centroid — so the same
    // group of points always gets the same id, and React keys (plus
    // whatever's selected) survive a re-cluster.
    id: `cluster-${members.map((m) => m.id).sort().join('_')}`,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    datasetCount: members.length, // one member = one dataset
    members,
    isCluster: true,
  };
}

// --- zoom level <-> clustering radius -------------------------------

export const MIN_CAMERA_DISTANCE = 1.62;
export const MAX_CAMERA_DISTANCE = 4.2;

/** Camera distance is continuous; clustering only needs to change in
 * discrete steps. Quantising it this way keeps the (somewhat expensive)
 * re-cluster off the render loop and makes cluster splits read as
 * distinct, animatable moments instead of a constant reshuffle. */
export const ZOOM_LEVELS = 7;

export function cameraDistanceToZoomLevel(distance: number): number {
  const span = MAX_CAMERA_DISTANCE - MIN_CAMERA_DISTANCE;
  const zoomedInAmount = 1 - clamp01((distance - MIN_CAMERA_DISTANCE) / span);
  return Math.round(zoomedInAmount * (ZOOM_LEVELS - 1));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** How close two points need to be (in degrees) to merge at a given
 * zoom level. Wide at level 0 (whole globe in view, so distant points
 * still merge) and 0 at the closest level, where every marker should be
 * individually reachable. */
export function zoomLevelToThresholdDeg(level: number): number {
  const thresholdsByLevel = [30, 22, 16, 11, 7, 4, 0];
  const clampedLevel = Math.min(thresholdsByLevel.length - 1, Math.max(0, level));
  return thresholdsByLevel[clampedLevel];
}

// --- presentation tiers ----------------------------------------------

/** Sized by dataset count directly — no normalisation against the
 * catalogue total, so the same count always lands in the same tier. */
export function clusterTier(datasetCount: number): ClusterTier {
  if (datasetCount > 25) return 'lg';
  if (datasetCount > 10) return 'md';
  if (datasetCount > 3) return 'sm';
  return 'xs';
}

/** On-screen pixel radius per tier (also the hit target, so none of
 * these go below comfortable tap size) plus the sonar-marker colours:
 * bright cyan for small clusters darkening toward the deep ZMT blue for
 * large ones, with the ring growing slightly bolder alongside. */
export const TIER_STYLE: Record<
  ClusterTier,
  { radiusPx: number; fill: string; ring: string; text: string }
> = {
  xs: { radiusPx: 30, fill: '#17abce', ring: 'rgba(111,224,240,0.4)', text: '#ffffff' },
  sm: { radiusPx: 36, fill: '#0f93c4', ring: 'rgba(111,224,240,0.44)', text: '#ffffff' },
  md: { radiusPx: 43, fill: '#0a7dba', ring: 'rgba(111,224,240,0.48)', text: '#ffffff' },
  lg: { radiusPx: 50, fill: '#04628f', ring: 'rgba(111,224,240,0.54)', text: '#ffffff' },
};
