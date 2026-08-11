import { useCallback, useMemo, useRef } from 'react';

/**
 * Imperative bridge between the DOM control buttons (outside the R3F
 * canvas) and the camera rig (inside it). The rig fills in `current` on
 * mount; the buttons call through it. Keeping this as a ref means the
 * controls never re-render the scene.
 */
export type GlobeCameraApi = {
  /** Multiply the orbit radius (>1 zooms out, <1 zooms in). */
  zoomBy: (factor: number) => void;
  /** Return to the default Africa/Europe framing. */
  reset: () => void;
  /** Animate to a geographic coordinate, optionally changing distance. */
  flyTo: (latitude: number, longitude: number, distance?: number) => void;
  /** Nudge the view by a delta in degrees (used by the direction pad). */
  panBy: (deltaLatitude: number, deltaLongitude: number) => void;
  /** Current orbit radius. */
  getDistance: () => number;
};

export type GlobeCameraHandle = {
  apiRef: React.MutableRefObject<GlobeCameraApi | null>;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  flyTo: (latitude: number, longitude: number, distance?: number) => void;
  panBy: (deltaLatitude: number, deltaLongitude: number) => void;
};

export function useGlobeCamera(): GlobeCameraHandle {
  const apiRef = useRef<GlobeCameraApi | null>(null);

  const zoomIn = useCallback(() => apiRef.current?.zoomBy(0.78), []);
  const zoomOut = useCallback(() => apiRef.current?.zoomBy(1.28), []);
  const reset = useCallback(() => apiRef.current?.reset(), []);
  const flyTo = useCallback(
    (latitude: number, longitude: number, distance?: number) =>
      apiRef.current?.flyTo(latitude, longitude, distance),
    [],
  );
  const panBy = useCallback(
    (deltaLatitude: number, deltaLongitude: number) =>
      apiRef.current?.panBy(deltaLatitude, deltaLongitude),
    [],
  );

  return useMemo(
    () => ({ apiRef, zoomIn, zoomOut, reset, flyTo, panBy }),
    [zoomIn, zoomOut, reset, flyTo, panBy],
  );
}

/** Default camera framing: Africa and Europe facing the viewer. */
export const HOME_VIEW = { latitude: 18, longitude: 14 };
