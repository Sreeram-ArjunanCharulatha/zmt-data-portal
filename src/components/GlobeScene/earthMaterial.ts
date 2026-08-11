import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Ocean grading.
 *
 * The supplied plate stores the sea almost black-navy, which is what
 * satellite imagery actually records but reads as murky on screen. This
 * material keeps the artwork unlit and untouched everywhere except the
 * water: a mask picks out pixels where blue dominates and brightness is
 * low, and remaps just those through a deep -> sky blue ramp. Land, ice,
 * desert and cloud pixels fail the mask and pass through exactly as they
 * are in the file.
 * ------------------------------------------------------------------ */

export type OceanGrade = {
  /** Colour of the deepest water. */
  deep: string;
  /** Colour of the brightest / shallowest water. */
  shallow: string;
  /** 0 = untouched plate, 1 = fully regraded water. */
  amount: number;
};

/* Mostly the plate's own water. `amount` is a blend back toward the
   supplied texture, so the sea keeps the asset's true deep-navy
   character and only gets enough lift to read on screen. */
export const DEFAULT_OCEAN: OceanGrade = {
  deep: '#153a61',
  shallow: '#3a739f',
  amount: 0.5,
};

const OCEAN_CHUNK = /* glsl */ `
  #include <map_fragment>

  {
    /* Work in approximate sRGB (sqrt of linear) so the thresholds and
       colours below are the ones you would pick in a colour picker. */
    vec3 s = sqrt(max(diffuseColor.rgb, vec3(0.0)));

    float luma = dot(s, vec3(0.299, 0.587, 0.114));
    float blueDominance = s.b - max(s.r, s.g);

    /* Water = blue-dominant and not bright (excludes ice, cloud, land). */
    float mask =
      smoothstep(0.012, 0.065, blueDominance) *
      (1.0 - smoothstep(0.42, 0.72, luma));

    /* Preserve the sea's own depth structure by driving the ramp with
       the original brightness. */
    vec3 graded = mix(uOceanDeep, uOceanShallow, smoothstep(0.04, 0.40, luma));

    s = mix(s, graded, mask * uOceanAmount);
    diffuseColor.rgb = s * s;
  }
`;

/**
 * Unlit earth material: every non-water pixel is exactly the pixel in
 * the texture, with no light multiply, specular or tint.
 */
export function createEarthMaterial(
  map: THREE.Texture,
  grade: OceanGrade = DEFAULT_OCEAN,
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ map, toneMapped: false });

  const uniforms = {
    uOceanDeep: { value: new THREE.Color(grade.deep) },
    uOceanShallow: { value: new THREE.Color(grade.shallow) },
    uOceanAmount: { value: grade.amount },
  };

  material.userData.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOceanDeep = uniforms.uOceanDeep;
    shader.uniforms.uOceanShallow = uniforms.uOceanShallow;
    shader.uniforms.uOceanAmount = uniforms.uOceanAmount;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform vec3 uOceanDeep;
         uniform vec3 uOceanShallow;
         uniform float uOceanAmount;
         void main() {`,
      )
      .replace('#include <map_fragment>', OCEAN_CHUNK);
  };

  /* Keep this material's program distinct from any plain basic material. */
  material.customProgramCacheKey = () => 'earth-ocean-grade';

  return material;
}
