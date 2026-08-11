import { useMemo } from 'react';
import type { ClusterNode, DatasetLocation } from '../types/dataset';
import { clusterLocations, zoomLevelToThresholdDeg } from '../utils/clustering';

/**
 * Reusable clustering hook.
 *
 * `zoomLevel` is the quantised camera distance (see
 * `cameraDistanceToZoomLevel`), so the expensive grouping pass runs only
 * when the user meaningfully changes zoom or the filter results change —
 * never per animation frame.
 */
export function useMarkerClustering(
  locations: DatasetLocation[],
  zoomLevel: number,
): ClusterNode[] {
  return useMemo(
    () => clusterLocations(locations, zoomLevelToThresholdDeg(zoomLevel)),
    [locations, zoomLevel],
  );
}
