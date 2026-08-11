import { useCallback, useEffect, useRef, type ElementRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { HOME_VIEW, type GlobeCameraApi } from '../../hooks/useGlobeCamera';
import { cameraDistanceToZoomLevel, MIN_CAMERA_DISTANCE } from '../../utils/clustering';
import { latLonToVector3, vector3ToLatLon } from '../../utils/geoCoordinates';

/** Extra room around the globe so it is never clipped by the viewport. */
const FIT_MARGIN = 1.14;

const TWO_PI = Math.PI * 2;

/** Accelerate, cruise, settle. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ------------------------------------------------------------------ *
 * Auto-rotation, tied to Earth's actual rotation.
 *
 * A sidereal day is 86,164 s. At 1:1 the globe would turn 0.004°/s —
 * motionless to the eye — so the rate is time-compressed by a fixed
 * factor. Everything stays derived from the real figure, so the speed is
 * a statement about how fast time runs, not an arbitrary number.
 *
 * OrbitControls completes one orbit in 60 / autoRotateSpeed seconds.
 * ------------------------------------------------------------------ */
const SIDEREAL_DAY_SECONDS = 86164;
/** 1 second on screen ≈ 12 minutes of Earth rotation (one turn ≈ 2 min). */
const TIME_COMPRESSION = 720;
const AUTO_ROTATE_SPEED = 60 / (SIDEREAL_DAY_SECONDS / TIME_COMPRESSION);

export type CameraFocus = {
  latitude: number;
  longitude: number;
  /** Orbit radius to settle at. Omitted means "keep the current zoom". */
  distance?: number;
  /** Skip the "don't crop the globe" clamp — used for direct selections. */
  allowClose?: boolean;
  /** Changes whenever the app wants the camera to re-focus. */
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
  const { camera, size } = useThree();

  const fitRef = useRef(2.6);
  /** Camera distance expressed as a multiple of the fit distance. */
  const zoomRatioRef = useRef(1);
  /** Distance the camera should ease to after a layout change. */
  const pendingFitRef = useRef<number | null>(null);
  const hasFittedRef = useRef(false);
  const zoomLevelRef = useRef(-1);
  const animRef = useRef({
    active: false,
    from: new THREE.Spherical(),
    to: new THREE.Spherical(),
    elapsed: 0,
    duration: 1,
  });

  /* ---------------------------------------------------------------- *
   * Fit the globe to whatever space the layout gives the canvas.
   * Runs on mount and on every resize (including when the dataset card
   * opens and shrinks the viewport height).
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) return;

    const aspect = size.width / Math.max(1, size.height);
    const vFov = (perspective.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    const distanceForVertical = FIT_MARGIN / Math.sin(vFov / 2);
    const distanceForHorizontal = FIT_MARGIN / Math.sin(hFov / 2);
    const fit = Math.max(distanceForVertical, distanceForHorizontal);

    fitRef.current = fit;

    const controls = controlsRef.current;
    if (controls) {
      controls.minDistance = Math.max(MIN_CAMERA_DISTANCE, fit * 0.48);
      controls.maxDistance = fit * 1.35;
    }

    /* Restore the user's zoom from a stored *ratio* of the fit distance
       rather than rescaling the current distance. Rescaling loses
       information whenever the intermediate value hits a clamp, so a
       burst of resizes (dev-tools drag, panel open/close) would ratchet
       the camera out to maxDistance. */
    const clamped = THREE.MathUtils.clamp(
      zoomRatioRef.current * fit,
      controls?.minDistance ?? MIN_CAMERA_DISTANCE,
      controls?.maxDistance ?? fit * 1.35,
    );

    if (hasFittedRef.current) {
      /* Hand the new distance to the frame loop to ease into. Applying
         it here would snap the camera, and a resize is not one event —
         collapsing the filter panel fires dozens as the width animates,
         so snapping each time reads as the globe flickering. */
      pendingFitRef.current = clamped;
    } else {
      perspective.position.setLength(clamped);
      hasFittedRef.current = true;
    }

    perspective.updateProjectionMatrix();
    controls?.update();
  }, [camera, size.width, size.height]);

  /* ---------------------------------------------------------------- *
   * Imperative API consumed by the on-screen control buttons.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const spherical = new THREE.Spherical();

    /* Set up an eased tween rather than an exponential chase. An
       exponential decay starts at full speed and creeps at the end;
       ease-in-out accelerates and settles, which is what reads as
       "smooth" when the globe swings across the world. */
    const animateTo = (position: THREE.Vector3) => {
      const anim = animRef.current;
      anim.from.setFromVector3(camera.position);
      anim.to.setFromVector3(position);

      /* Always take the short way round. */
      while (anim.to.theta - anim.from.theta > Math.PI) anim.to.theta -= TWO_PI;
      while (anim.to.theta - anim.from.theta < -Math.PI) anim.to.theta += TWO_PI;

      /* Longer journeys get more time, so speed stays roughly constant
         instead of every move taking the same duration. */
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
        /* Step from wherever the camera is now, so the pad nudges the
           view rather than jumping to an absolute coordinate. */
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

  /* Initial framing: Africa and Europe facing the viewer. */
  useEffect(() => {
    latLonToVector3(
      HOME_VIEW.latitude,
      HOME_VIEW.longitude,
      fitRef.current,
      camera.position,
    );
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
    /* Mount-only on purpose — later framing changes go through the API. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Snapshot the zoom as a ratio of the fit distance. Called when a
     gesture or animation finishes — never during a resize, so a clamped
     intermediate value can't overwrite the user's real zoom. */
  const commitZoomRatio = useCallback(() => {
    zoomRatioRef.current = camera.position.length() / fitRef.current;
  }, [camera]);

  /* Focus the selected location — also covers selections made in the
     list view, where the scene was unmounted when the click happened.
     Selecting a marker rotates only: changing the zoom here would cross a
     clustering threshold and make the whole marker layer rebuild. */
  useEffect(() => {
    if (!focus) return;
    /* Filter-driven moves never zoom past the framing distance, so a
       broad query cannot crop the globe. An explicit dataset selection
       is a user action, so it is allowed all the way in. */
    const distance =
      focus.distance === undefined
        ? undefined
        : focus.allowClose
          ? focus.distance
          : Math.max(focus.distance, fitRef.current * 0.88);
    apiRef.current?.flyTo(focus.latitude, focus.longitude, distance);
  }, [focus, apiRef]);

  /* ---------------------------------------------------------------- *
   * Per-frame: run camera animations, publish zoom level.
   * ---------------------------------------------------------------- */
  const current = useRef(new THREE.Spherical());

  useFrame((_, delta) => {
    const anim = animRef.current;

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
      /* Ease into the framing distance a layout change asked for. */
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

    /* Google-Earth-style handling: the closer you are, the less ground a
       drag covers, so the surface tracks the pointer instead of whipping
       past it. */
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
      autoRotate={autoRotate && !reducedMotion}
      autoRotateSpeed={AUTO_ROTATE_SPEED}
      minDistance={MIN_CAMERA_DISTANCE}
      maxDistance={4.2}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI - 0.12}
      onStart={() => {
        animRef.current.active = false;
        /* The user is driving now; drop any queued framing correction. */
        pendingFitRef.current = null;
        onUserInteract();
      }}
      onEnd={commitZoomRatio}
    />
  );
}
