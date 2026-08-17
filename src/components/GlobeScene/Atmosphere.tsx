import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../../utils/geoCoordinates';

/* ------------------------------------------------------------------ *
 * Atmosphere — a single shell.
 *
 * The obvious approach (a fresnel term on a slightly larger sphere) has
 * a flaw: fresnel peaks at the *shell's* own silhouette, so the glow is
 * brightest at the shell's outer edge and stops dead there. One shell
 * looks like a hard ring; two shells look like two hard rings.
 *
 * Instead this measures each fragment's impact parameter — the
 * perpendicular distance from the eye ray to the planet's centre — and
 * fades from the globe's limb outwards, reaching exactly zero at the
 * shell boundary. That gives a genuine falling-off halo with no visible
 * edge anywhere.
 * ------------------------------------------------------------------ */

/** Outer extent of the halo, in globe radii. Tight on purpose.
 *  Exported because CameraRig's framing margin is derived from it — the
 *  camera has to fit the halo, not just the sphere, or the glow gets
 *  cropped at the viewport edge. */
export const HALO_RADIUS = 1.19;

export function Atmosphere() {
  const geometry = useMemo(
    () => new THREE.SphereGeometry(GLOBE_RADIUS * HALO_RADIUS, 64, 48),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uInner: { value: new THREE.Color('#8ec4e8') },
          uOuter: { value: new THREE.Color('#2a6a9e') },
          /* Restrained on purpose: at 0.42 this read as a lit rim from a
             sci-fi HUD rather than atmospheric scattering. Low enough to
             be depth cueing, not a light source. */
          uIntensity: { value: 0.3 },
          uGlobeRadius: { value: GLOBE_RADIUS },
          uHaloRadius: { value: GLOBE_RADIUS * HALO_RADIUS },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorldPosition;
          void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uInner;
          uniform vec3 uOuter;
          uniform float uIntensity;
          uniform float uGlobeRadius;
          uniform float uHaloRadius;
          varying vec3 vWorldPosition;

          void main() {
            /* Perpendicular distance from the eye ray to the globe's
               centre. Equal to uGlobeRadius exactly on the limb. */
            vec3 rayDir = normalize(vWorldPosition - cameraPosition);
            float impact = length(cross(cameraPosition, rayDir));

            /* 0 at the limb -> 1 at the outer edge of the halo. */
            float t = clamp(
              (impact - uGlobeRadius) / (uHaloRadius - uGlobeRadius),
              0.0,
              1.0
            );

            /* One continuous term. An extra "bright limb" term on top
               of this is what reads as a second, separate glow, so
               there deliberately isn't one. */
            float falloff = pow(1.0 - t, 3.0);
            /* Ramp up over the first sliver so the halo meets the
               planet's edge softly instead of as a drawn line. */
            float contact = smoothstep(0.0, 0.09, t);

            vec3 color = mix(uInner, uOuter, smoothstep(0.0, 0.6, t));
            float alpha = falloff * contact * uIntensity;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        /* Back faces only, and depth-tested, so the planet itself masks
           the middle and only the annulus around it is ever drawn. */
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: true,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={1}
      raycast={() => null}
    />
  );
}
