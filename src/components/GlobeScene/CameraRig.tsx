import { useCallback, useEffect, useRef, type ElementRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { HOME_VIEW, type GlobeCameraApi } from '../../hooks/useGlobeCamera';
import { cameraDistanceToZoomLevel, MIN_CAMERA_DISTANCE } from '../../utils/clustering';
import { latLonToVector3, vector3ToLatLon } from '../../utils/geoCoordinates';
import { HALO_RADIUS } from './Atmosphere';

// Frame the halo, not just the sphere, or the glow gets clipped.
// Keep above ~1.02 or it starts cropping again.
const FIT_MARGIN = HALO_RADIUS * 1.06;

// Globe size, as a fraction of viewport height. Against the viewport
// rather than the canvas, so windowed and fullscreen match on screen.
const GLOBE_VIEWPORT_FRACTION = 0.55;

// Above this, a resize is a layout switch (fullscreen) rather than a
// frame of an animation (panel sliding open).
const LARGE_RESIZE_FRACTION = 0.15;

// Keeps the zoom range put when FIT_MARGIN changes.
const LEGACY_FIT_MARGIN = 1.14;
const ZOOM_RANGE_REBASE = LEGACY_FIT_MARGIN / FIT_MARGIN;

const TWO_PI = Math.PI * 2;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Auto-rotation, scaled off a real sidereal day so the speed means
// something. Bump TIME_COMPRESSION to spin faster.
const SIDEREAL_DAY_SECONDS = 86164;
const TIME_COMPRESSION = 720; // ~2 min per turn
const SECONDS_PER_TURN = SIDEREAL_DAY_SECONDS / TIME_COMPRESSION;

// Per second, not per frame. drei calls controls.update() without a
// delta, so three.js assumes 60fps and we spin 2x fast on a 120Hz screen.
const AUTO_ROTATE_RADIANS_PER_SECOND = (Math.PI * 2) / SECONDS_PER_TURN;
const AUTO_ROTATE_AXIS = new THREE.Vector3(0, 1, 0);

export type CameraFocus = {
  latitude: number;
  longitude: number;
  /** Orbit radius to settle at. Omit to keep the current zoom. */
  distance?: number;
  /** Skip the anti-crop clamp. Used for direct selections. */
  allowClose?: boolean;
  /** Bump to re-trigger a focus. */
  key: string;
};

type CameraRigProps = {
  apiRef: React.MutableRefObject<GlobeCameraApi | null>;
  autoRotate: boolean;
  reducedMotion: boolean;
  focus: CameraFocus | null;
  onUserInteract: () => void;
  onZoomLevelChange: (level: number) => void;
};

export function CameraRig({
  apiRef,
  autoRotate,
  reducedMotion,
  focus,
  onUserInteract,
  onZoomLevelChange,
}: CameraRigProps) {
  const controlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const { camera, size, gl } = useThree();
  // Reactive, unlike controlsRef — that's still null when effects
  // first run, so anything depending on controls has to use this.
  const defaultControls = useThree((state) => state.controls);

  const fitRef = useRef(2.6);
  /** Camera distance expressed as a multiple of the fit distance. */
  const zoomRatioRef = useRef(1);
  /** Distance the camera should ease to after a layout change. */
  const pendingFitRef = useRef<number | null>(null);
  const hasFittedRef = useRef(false);
  // Tells a fullscreen toggle from a panel animation.
  const previousSizeRef = useRef({ width: 0, height: 0 });
  const zoomLevelRef = useRef(-1);
  const animRef = useRef({
    active: false,
    from: new THREE.Spherical(),
    to: new THREE.Spherical(),
    elapsed: 0,
    duration: 1,
  });

  // Re-fit on mount and on every resize.
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) return;

    const aspect = size.width / Math.max(1, size.height);
    const vFov = (perspective.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    // Closest we can get without clipping the halo on either axis.
    const distanceForVertical = FIT_MARGIN / Math.sin(vFov / 2);
    const distanceForHorizontal = FIT_MARGIN / Math.sin(hFov / 2);
    const distanceThatFits = Math.max(distanceForVertical, distanceForHorizontal);

    // Solve for a target diameter in real pixels. Fullscreen's canvas is
    // ~25% taller, so a canvas-relative fraction rendered bigger there.
    // Inverse projection: radius 1 at distance d subtends asin(1/d).
    const viewportHeight =
      document.documentElement.clientHeight || size.height;
    const targetRadiusPx = (viewportHeight * GLOBE_VIEWPORT_FRACTION) / 2;
    const halfCanvasPx = Math.max(1, size.height / 2);
    const tanAngular =
      (targetRadiusPx / halfCanvasPx) * Math.tan(vFov / 2);
    const distanceForTarget = 1 / Math.sin(Math.atan(tanAngular));

    // Target usually wins; the floor kicks in on short/narrow viewports.
    const fit = Math.max(distanceThatFits, distanceForTarget);

    fitRef.current = fit;

    const controls = controlsRef.current;
    if (controls) {
      // Pinned, not fit-relative. Otherwise it differs per view and
      // fullscreen ends up clamping CLOSE_UP_DISTANCE in App.tsx.
      controls.minDistance = MIN_CAMERA_DISTANCE;
      controls.maxDistance = fit * 1.35 * ZOOM_RANGE_REBASE;
    }

    // Restore zoom from a stored ratio. Rescaling the live distance
    // ratchets out to maxDistance across a burst of resizes.
    const clamped = THREE.MathUtils.clamp(
      zoomRatioRef.current * fit,
      controls?.minDistance ?? MIN_CAMERA_DISTANCE,
      controls?.maxDistance ?? fit * 1.35,
    );

    // How much the canvas just changed.
    const previous = previousSizeRef.current;
    const relativeChange = Math.max(
      Math.abs(size.width - previous.width) / Math.max(1, previous.width),
      Math.abs(size.height - previous.height) / Math.max(1, previous.height),
    );
    previousSizeRef.current = { width: size.width, height: size.height };

    if (!hasFittedRef.current) {
      perspective.position.setLength(clamped);
      hasFittedRef.current = true;
    } else if (relativeChange > LARGE_RESIZE_FRACTION) {
      // Fullscreen toggle. The camera move compensates for the resize,
      // so both have to land on the same frame or you see it stutter.
      perspective.position.setLength(clamped);
      pendingFitRef.current = null;
      zoomRatioRef.current = clamped / fit;
    } else {
      // Incremental. Ease into it — the filter panel fires dozens of
      // these as it animates and snapping each one flickers.
      pendingFitRef.current = clamped;
    }

    perspective.updateProjectionMatrix();
    controls?.update();
  }, [camera, size.width, size.height]);

  // Only zoom when the pointer is actually over the globe, otherwise the
  // full-bleed canvas eats every scroll and the page won't move.
  // OrbitControls only preventDefaults while enableZoom is true, so
  // toggling it hands the gesture back to the document.
  //
  // Not a JSX prop: drei only writes props it's given, so setting it
  // imperatively survives re-renders.
  useEffect(() => {
    const controls = defaultControls as { enableZoom: boolean } | null;
    const element = gl.domElement;
    if (!controls || !element) return;

    // A little past the silhouette so the limb counts as "on the globe".
    const ZOOM_HIT_PADDING = 1.06;

    const isOverGlobe = (event: { clientX: number; clientY: number }) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      const perspective = camera as THREE.PerspectiveCamera;
      if (!perspective.isPerspectiveCamera) return false;

      // Camera always looks at the origin, so the globe is centred.
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);

      // asin(R/d) is the angular radius; project it to pixels.
      const distance = perspective.position.length();
      if (distance <= 1) return true;
      const angular = Math.asin(Math.min(1, 1 / distance));
      const vFov = (perspective.fov * Math.PI) / 180;
      const radiusPx =
        (Math.tan(angular) / Math.tan(vFov / 2)) * (rect.height / 2);

      return Math.hypot(dx, dy) <= radiusPx * ZOOM_HIT_PADDING;
    };

    // Capture phase, so we run before OrbitControls' own handler.
    // Don't track this from pointermove — a trackpad scroll fires no
    // pointer event, and the stale flag sends the zoom to the page.
    const handleWheelCapture = (event: WheelEvent) => {
      controls.enableZoom = isOverGlobe(event);
    };

    controls.enableZoom = false;
    element.addEventListener('wheel', handleWheelCapture, {
      capture: true,
      passive: true,
    });
    return () => {
      element.removeEventListener('wheel', handleWheelCapture, {
        capture: true,
      });
    };
  }, [camera, gl, defaultControls]);

  // Imperative API for the on-screen buttons.
  useEffect(() => {
    const spherical = new THREE.Spherical();

    // Eased tween, not an exponential chase — decay starts fast and
    // crawls at the end, which looks wrong on a long swing.
    const animateTo = (position: THREE.Vector3) => {
      const anim = animRef.current;
      anim.from.setFromVector3(camera.position);
      anim.to.setFromVector3(position);

      // Take the short way round.
      while (anim.to.theta - anim.from.theta > Math.PI) anim.to.theta -= TWO_PI;
      while (anim.to.theta - anim.from.theta < -Math.PI) anim.to.theta += TWO_PI;

      // Longer trips take longer, so the speed stays about the same.
      const swing = Math.hypot(
        anim.to.theta - anim.from.theta,
        anim.to.phi - anim.from.phi,
      );
      const dolly = Math.abs(anim.to.radius - anim.from.radius);
      anim.duration = THREE.MathUtils.clamp(
        0.55 + swing * 0.42 + dolly * 0.35,
        0.55,
        2.1,
      );
      anim.elapsed = 0;
      anim.active = true;
    };

    const clampDistance = (distance: number) => {
      const controls = controlsRef.current;
      const min = controls?.minDistance ?? MIN_CAMERA_DISTANCE;
      const max = controls?.maxDistance ?? fitRef.current * 1.35;
      return THREE.MathUtils.clamp(distance, min, max);
    };

    const api: GlobeCameraApi = {
      getDistance: () => camera.position.length(),

      zoomBy: (factor) => {
        spherical.setFromVector3(camera.position);
        const next = clampDistance(spherical.radius * factor);
        const target = new THREE.Vector3().setFromSpherical(
          new THREE.Spherical(next, spherical.phi, spherical.theta),
        );
        animateTo(target);
      },

      reset: () => {
        animateTo(
          latLonToVector3(HOME_VIEW.latitude, HOME_VIEW.longitude, fitRef.current),
        );
      },

      flyTo: (latitude, longitude, distance) => {
        const radius = clampDistance(distance ?? camera.position.length());
        animateTo(latLonToVector3(latitude, longitude, radius));
      },

      panBy: (deltaLatitude, deltaLongitude) => {
        // Step from where we are, so the pad nudges rather than jumps.
        const origin = animRef.current.active
          ? new THREE.Vector3().setFromSpherical(animRef.current.to)
          : camera.position;
        const { latitude, longitude } = vector3ToLatLon(origin);
        const nextLat = THREE.MathUtils.clamp(
          latitude + deltaLatitude,
          -82,
          82,
        );
        animateTo(
          latLonToVector3(nextLat, longitude + deltaLongitude, origin.length()),
        );
      },
    };

    apiRef.current = api;
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera]);

  // Start on Africa/Europe.
  useEffect(() => {
    latLonToVector3(
      HOME_VIEW.latitude,
      HOME_VIEW.longitude,
      fitRef.current,
      camera.position,
    );
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
    // Mount only; later moves go through the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snapshot zoom as a ratio of the fit distance. Only after a gesture
  // settles, never mid-resize, or a clamped value overwrites the real one.
  const commitZoomRatio = useCallback(() => {
    zoomRatioRef.current = camera.position.length() / fitRef.current;
  }, [camera]);

  // Fly to the selected location. Rotate only — changing zoom here
  // crosses a clustering threshold and rebuilds the whole marker layer.
  useEffect(() => {
    if (!focus) return;
    // Filter moves stay behind the framing distance so a broad query
    // can't crop the globe. A direct selection may go all the way in.
    const distance =
      focus.distance === undefined
        ? undefined
        : focus.allowClose
          ? focus.distance
          : Math.max(focus.distance, fitRef.current * 0.88);
    apiRef.current?.flyTo(focus.latitude, focus.longitude, distance);
  }, [focus, apiRef]);

  // Per-frame: animations, auto-rotate, zoom level.
  const current = useRef(new THREE.Spherical());

  useFrame((_, delta) => {
    const anim = animRef.current;

    // Skipped while an animation owns the camera.
    if (autoRotate && !reducedMotion && !anim.active) {
      camera.position.applyAxisAngle(
        AUTO_ROTATE_AXIS,
        -AUTO_ROTATE_RADIANS_PER_SECOND * Math.min(delta, 0.05),
      );
      camera.lookAt(0, 0, 0);
    }

    if (anim.active) {
      anim.elapsed += Math.min(delta, 0.05);
      const t = reducedMotion
        ? 1
        : THREE.MathUtils.clamp(anim.elapsed / anim.duration, 0, 1);
      const eased = easeInOutCubic(t);

      current.current.set(
        THREE.MathUtils.lerp(anim.from.radius, anim.to.radius, eased),
        THREE.MathUtils.lerp(anim.from.phi, anim.to.phi, eased),
        THREE.MathUtils.lerp(anim.from.theta, anim.to.theta, eased),
      );

      camera.position.setFromSpherical(current.current);
      camera.lookAt(0, 0, 0);

      if (t >= 1) {
        anim.active = false;
        commitZoomRatio();
      }
    } else if (pendingFitRef.current !== null) {
      // Ease into the distance a layout change asked for.
      const targetRadius = pendingFitRef.current;
      const radius = camera.position.length();
      const next = THREE.MathUtils.lerp(
        radius,
        targetRadius,
        1 - Math.exp(-Math.min(delta, 0.05) * 12),
      );
      camera.position.setLength(next);

      if (Math.abs(next - targetRadius) < 0.002) {
        camera.position.setLength(targetRadius);
        pendingFitRef.current = null;
        commitZoomRatio();
      }
    }

    const distance = camera.position.length();

    // Slow the drag down as you get closer, like Google Earth, so the
    // surface tracks the pointer instead of flying past it.
    const controls = controlsRef.current;
    if (controls) {
      const span = Math.max(0.001, fitRef.current - MIN_CAMERA_DISTANCE);
      const altitude = THREE.MathUtils.clamp(
        (distance - MIN_CAMERA_DISTANCE) / span,
        0,
        1,
      );
      controls.rotateSpeed = THREE.MathUtils.lerp(0.11, 0.45, altitude);
    }

    const level = cameraDistanceToZoomLevel(distance);
    if (level !== zoomLevelRef.current) {
      zoomLevelRef.current = level;
      onZoomLevelChange(level);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.42}
      zoomSpeed={0.55}
      minDistance={MIN_CAMERA_DISTANCE}
      maxDistance={4.2}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI - 0.12}
      onStart={() => {
        animRef.current.active = false;
        // User's driving now, drop any queued correction.
        pendingFitRef.current = null;
        onUserInteract();
      }}
      onEnd={commitZoomRatio}
    />
  );
}
