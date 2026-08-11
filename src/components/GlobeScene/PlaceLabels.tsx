import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CITIES,
  CITY_TIER_ZOOM,
  COUNTRIES,
  COUNTRY_TIER_ZOOM,
  type Place,
} from '../../data/places';
import { createLabelTexture } from '../../utils/earthTexture';
import { latLonToVector3 } from '../../utils/geoCoordinates';

const LABEL_ALTITUDE = 1.006;
const REFERENCE_DISTANCE = 2.6;
const DECLUTTER_INTERVAL = 0.16;

/** World-space height of a label at the reference camera distance. */
const HEIGHT_COUNTRY = 0.078;
const HEIGHT_CITY = 0.062;

type LabelEntry = Place & { kind: 'country' | 'city' };

type PlaceLabelsProps = {
  /** Quantised camera distance: 0 = whole globe, 6 = closest. */
  zoomLevel: number;
};

/**
 * Country and city names that fade in as the user zooms.
 *
 * Names are baked into canvas sprites, so they billboard automatically
 * and need no font loading. Which names exist at all is decided in React
 * (by zoom tier); visibility, fading and overlap removal happen in one
 * per-frame pass, mirroring how the dataset markers are handled.
 */
export function PlaceLabels({ zoomLevel }: PlaceLabelsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const declutterClock = useRef(0);
  const projected = useRef(new THREE.Vector3());

  const entries = useMemo<LabelEntry[]>(() => {
    const visible: LabelEntry[] = [];
    COUNTRIES.forEach((place) => {
      if (zoomLevel >= COUNTRY_TIER_ZOOM[place.tier]) {
        visible.push({ ...place, kind: 'country' });
      }
    });
    CITIES.forEach((place) => {
      if (zoomLevel >= CITY_TIER_ZOOM[place.tier]) {
        visible.push({ ...place, kind: 'city' });
      }
    });
    return visible;
  }, [zoomLevel]);

  const sprites = useMemo(
    () =>
      entries.map((entry) => {
        const { texture, aspect } = createLabelTexture(entry.name, entry.kind);
        const height =
          entry.kind === 'country' ? HEIGHT_COUNTRY : HEIGHT_CITY;
        return {
          entry,
          texture,
          aspect,
          height,
          position: latLonToVector3(
            entry.latitude,
            entry.longitude,
            LABEL_ALTITUDE,
          ),
        };
      }),
    [entries],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const { camera, size } = state;
    const cameraDistance = camera.position.length();
    const children = group.children as THREE.Sprite[];

    /* ---- scale + horizon fade -------------------------------------- */
    for (let i = 0; i < children.length; i += 1) {
      const sprite = children[i];
      const meta = sprites[i];
      if (!meta) continue;

      /* Distance to *this* point, not the orbit radius: near the centre
         of a zoomed-in globe a point is far closer than the camera's
         distance to the origin, and using the latter makes labels swell
         as you zoom. */
      const pointDistance = camera.position.distanceTo(sprite.position);
      sprite.userData.pointDistance = pointDistance;

      const height = meta.height * (pointDistance / REFERENCE_DISTANCE);
      sprite.scale.set(height * meta.aspect, height, 1);

      /* Names near the limb are unreadable, so fade them out earlier
         than markers do. */
      const facing = sprite.position.dot(camera.position) - 1;
      const fade = THREE.MathUtils.clamp(facing / (0.3 * cameraDistance), 0, 1);
      sprite.userData.horizonFade = fade;
    }

    /* ---- overlap removal (throttled) ------------------------------- */
    declutterClock.current += delta;
    const rebuild = declutterClock.current >= DECLUTTER_INTERVAL;
    if (rebuild) declutterClock.current = 0;

    if (rebuild) {
      const kept: Array<{ x: number; y: number; w: number; h: number }> = [];

      /* Countries claim space before cities. */
      const order = children
        .map((sprite, index) => ({ sprite, meta: sprites[index] }))
        .filter((item) => item.meta)
        .sort((a, b) => {
          const aRank = a.meta.entry.kind === 'country' ? 0 : 1;
          const bRank = b.meta.entry.kind === 'country' ? 0 : 1;
          return aRank - bRank || a.meta.entry.tier - b.meta.entry.tier;
        });

      for (const { sprite, meta } of order) {
        if ((sprite.userData.horizonFade ?? 0) < 0.05) {
          sprite.userData.occluded = true;
          continue;
        }

        projected.current.copy(sprite.position).project(camera);
        const x = (projected.current.x * 0.5 + 0.5) * size.width;
        const y = (-projected.current.y * 0.5 + 0.5) * size.height;
        /* World height -> on-screen pixels for a 45° vertical FOV. */
        const worldPerScreen =
          0.8284 * ((sprite.userData.pointDistance as number) ?? cameraDistance);
        const h = (sprite.scale.y / worldPerScreen) * size.height;
        const w = h * meta.aspect;

        const overlaps = kept.some(
          (other) =>
            Math.abs(x - other.x) < (w + other.w) * 0.5 &&
            Math.abs(y - other.y) < (h + other.h) * 0.62,
        );

        sprite.userData.occluded = overlaps;
        if (!overlaps) kept.push({ x, y, w, h });
      }
    }

    /* ---- commit opacity -------------------------------------------- */
    for (const sprite of children) {
      const material = sprite.material as THREE.SpriteMaterial;
      const fade = (sprite.userData.horizonFade as number) ?? 0;
      const target = sprite.userData.occluded ? 0 : fade;
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        target,
        1 - Math.exp(-Math.min(delta, 0.05) * 9),
      );
      sprite.visible = material.opacity > 0.02;
    }
  });

  if (sprites.length === 0) return null;

  return (
    <group ref={groupRef}>
      {sprites.map((sprite) => (
        <sprite
          key={`${sprite.entry.kind}-${sprite.entry.name}`}
          position={sprite.position}
          renderOrder={6}
          raycast={() => null}
        >
          <spriteMaterial
            map={sprite.texture}
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            sizeAttenuation
          />
        </sprite>
      ))}
    </group>
  );
}
