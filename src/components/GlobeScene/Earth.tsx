import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCloudTexture, createEarthTexture } from '../../utils/earthTexture';
import { GLOBE_RADIUS } from '../../utils/geoCoordinates';
import { useEarthTextures } from './useEarthTextures';
import { createEarthMaterial } from './earthMaterial';

type EarthProps = {
  showClouds: boolean;
  reducedMotion: boolean;
  onSurfaceDoubleClick: (point: THREE.Vector3) => void;
};

/** How long the procedural placeholder takes to dissolve into the real
 * photographic imagery once it's ready. An instant swap reads as a
 * jarring flash — the two look nothing alike (lit/glossy placeholder
 * vs. flat, unlit photo) — and on a hard refresh, when the ~2MB of
 * imagery always has to be refetched, that flash happens every time. */
const CROSSFADE_SECONDS = 0.6;

export function Earth({
  showClouds,
  reducedMotion,
  onSurfaceDoubleClick,
}: EarthProps) {
  const cloudsRef = useRef<THREE.Mesh>(null);

  const photo = useEarthTextures(true);

  /* Drawn stand-in, shown for the moment before the imagery arrives. */
  const drawnEarth = useMemo(() => createEarthTexture('globe'), []);
  const drawnClouds = useMemo(() => createCloudTexture(), []);

  const earthGeometry = useMemo(
    () => new THREE.SphereGeometry(GLOBE_RADIUS, 128, 80),
    [],
  );
  /* Fractionally larger than the procedural sphere so it unambiguously
     wins depth testing while both are visible during the crossfade,
     instead of the two z-fighting at an identical radius. */
  const photoGeometry = useMemo(
    () => new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 128, 80),
    [],
  );
  const cloudGeometry = useMemo(
    () => new THREE.SphereGeometry(GLOBE_RADIUS * 1.014, 96, 64),
    [],
  );

  /* Unlit, like the photo material below — the placeholder used to be a
     *lit* MeshStandardMaterial, which picked up the scene's strong
     camera-following key light as a glossy specular highlight and a
     dark shadowed limb. That read as a cheap, plasticky "cartoon globe"
     next to the flat, clean photo texture it's standing in for, and the
     mismatch was obvious for however long the placeholder stayed on
     screen. Flat unlit colour is what actually matches. */
  const drawnMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: drawnEarth,
        transparent: true,
        toneMapped: false,
      }),
    [drawnEarth],
  );

  /* Unlit material with the ocean regraded; created once the imagery
     arrives and disposed with the component. Starts fully transparent
     — the crossfade below eases it in. */
  const photoMaterial = useMemo(() => {
    if (!photo) return null;
    const material = createEarthMaterial(photo.day);
    material.transparent = true;
    material.opacity = 0;
    return material;
  }, [photo]);

  useEffect(
    () => () => {
      earthGeometry.dispose();
      photoGeometry.dispose();
      cloudGeometry.dispose();
    },
    [earthGeometry, photoGeometry, cloudGeometry],
  );

  useEffect(() => () => drawnMaterial.dispose(), [drawnMaterial]);

  useEffect(() => {
    if (!photoMaterial) return;
    return () => photoMaterial.dispose();
  }, [photoMaterial]);

  const fade = useRef(0);
  /* Once the crossfade finishes, the procedural mesh stops being
     rendered at all — no reason to keep paying for a hidden sphere. */
  const [placeholderDone, setPlaceholderDone] = useState(false);

  useFrame((_, delta) => {
    if (cloudsRef.current && !reducedMotion) {
      /* Slow, independent drift so the cloud layer never looks locked. */
      cloudsRef.current.rotation.y += delta * 0.006;
    }

    if (!photoMaterial || placeholderDone) return;

    fade.current = Math.min(1, fade.current + delta / CROSSFADE_SECONDS);
    const eased = 1 - Math.pow(1 - fade.current, 3); // ease-out cubic
    photoMaterial.opacity = eased;
    drawnMaterial.opacity = 1 - eased;

    if (fade.current >= 1) {
      /* Only needs to be in the transparent render bucket while it's
         actually fading in. Left transparent permanently, it stays
         there alongside the (also-transparent) cloud sphere forever —
         and since both spheres share the same centre, three.js's
         transparent-object sort (back-to-front by distance from camera)
         has no real distance to sort by and can order them either way.
         Draw the photo sphere after the clouds and it paints straight
         over them, near-opaque, hiding them completely. Opaque
         rendering doesn't have this ambiguity: it depth-tests per pixel
         instead of sorting whole objects, so the closer cloud sphere
         always wins on the near hemisphere regardless of draw order. */
      photoMaterial.transparent = false;
      setPlaceholderDone(true);
    }
  });

  const usingPhoto = photo !== null;
  const handleDoubleClick = (event: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    event.stopPropagation();
    onSurfaceDoubleClick(event.point.clone());
  };

  return (
    <group>
      {!placeholderDone && (
        <mesh
          geometry={earthGeometry}
          material={drawnMaterial}
          onDoubleClick={(event) => handleDoubleClick(event)}
        />
      )}

      {photoMaterial && (
        <mesh
          geometry={photoGeometry}
          material={photoMaterial}
          onDoubleClick={(event) => handleDoubleClick(event)}
        />
      )}

      {showClouds && (
        <mesh ref={cloudsRef} geometry={cloudGeometry} raycast={() => null}>
          {usingPhoto ? (
            /* Greyscale cloud plate drives opacity, so clouds stay pure
               white and everything else is fully transparent — unlit,
               like the surface below. */
            <meshBasicMaterial
              color="#ffffff"
              alphaMap={photo.clouds}
              transparent
              opacity={1}
              depthWrite={false}
              toneMapped={false}
            />
          ) : (
            <meshBasicMaterial
              map={drawnClouds}
              transparent
              opacity={0.32}
              depthWrite={false}
              toneMapped={false}
            />
          )}
        </mesh>
      )}
    </group>
  );
}
