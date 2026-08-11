import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

/**
 * Soft, camera-relative lighting.
 *
 * A world-fixed sun would leave half the globe in darkness as the user
 * orbits, which is dramatic but unusable for a data map. The key light
 * therefore trails the camera at an offset, so the hemisphere being
 * looked at is always readable while still getting directional shading.
 */
export function SceneLighting() {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ camera }) => {
    const key = keyRef.current;
    const fill = fillRef.current;
    if (!key || !fill) return;

    key.position.copy(camera.position);
    /* Offset up and to the left of the viewer for gentle relief. */
    key.position.x -= camera.position.z * 0.35;
    key.position.z += camera.position.x * 0.35;
    key.position.y += 0.9;

    fill.position.copy(camera.position).multiplyScalar(-1);
    fill.position.y -= 0.5;
  });

  return (
    <>
      {/* Lower ambient + a stronger key gives the imagery its contrast
          back: bright sunlit face, naturally darkening limb. */}
      <ambientLight intensity={0.72} />
      <directionalLight ref={keyRef} intensity={2.1} color="#fffaf2" />
      <directionalLight ref={fillRef} intensity={0.3} color="#8fb6d4" />
    </>
  );
}
