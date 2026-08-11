import { useEffect, useMemo, useRef } from 'react';
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
  const cloudGeometry = useMemo(
    () => new THREE.SphereGeometry(GLOBE_RADIUS * 1.014, 96, 64),
    [],
  );

  /* Unlit material with the ocean regraded; created once the imagery
     arrives and disposed with the component. */
  const photoMaterial = useMemo(
    () => (photo ? createEarthMaterial(photo.day) : null),
    [photo],
  );

  useEffect(
    () => () => {
      earthGeometry.dispose();
      cloudGeometry.dispose();
    },
    [earthGeometry, cloudGeometry],
  );

  useEffect(() => {
    if (!photoMaterial) return;
    return () => photoMaterial.dispose();
  }, [photoMaterial]);

  useFrame((_, delta) => {
    if (reducedMotion || !cloudsRef.current) return;
    /* Slow, independent drift so the cloud layer never looks locked. */
    cloudsRef.current.rotation.y += delta * 0.006;
  });

  const usingPhoto = photo !== null;

  return (
    <group>
      <mesh
        geometry={earthGeometry}
        material={usingPhoto ? photoMaterial ?? undefined : undefined}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onSurfaceDoubleClick(event.point.clone());
        }}
      >
        {!usingPhoto && (
          <meshStandardMaterial
            map={drawnEarth}
            roughness={0.92}
            metalness={0.02}
          />
        )}
      </mesh>

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
            <meshStandardMaterial
              map={drawnClouds}
              transparent
              opacity={0.32}
              depthWrite={false}
              roughness={1}
            />
          )}
        </mesh>
      )}
    </group>
  );
}
