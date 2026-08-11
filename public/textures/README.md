# Earth imagery

Equirectangular (2:1) satellite maps used by the photographic globe
styles. Both are web-optimised derivatives of the supplied Earth asset
pack; the originals were far too large to serve to a browser.

| File               | Shipped     | Original      | Used as                       |
| ------------------ | ----------- | ------------- | ----------------------------- |
| `earth-day.jpg`    | 6144 × 3072 | 21600 × 10800 | `map` — surface colour        |
| `earth-clouds.jpg` | 3072 × 1536 | 16384 × 8192  | `alphaMap` on the cloud shell |

Total ≈ 4.3 MB, fetched **after** first paint (see
`src/components/GlobeScene/useEarthTextures.ts`). Until they arrive the
canvas-drawn globe is shown, so the scene is never blank.

## Rendered unlit, with the ocean regraded

The globe uses `meshBasicMaterial` with `toneMapped={false}`, so land,
ice, desert and cloud pixels are exactly the pixels in `earth-day.jpg`:

- no light multiplying (which darkens and greys the plate),
- no `specularMap` (which put a sheen across the oceans and shifted
  their colour),
- no `normalMap` (which re-shades terrain against the baked-in lighting),
- no material `color` tint.

The pack's `LOP_earth_n.tif` and `LOP_earth_spec.jpg` are therefore not
shipped: they only matter to a lit material. If the globe is ever moved
back to a lit material, regenerate them from the original pack.

The **one** graded element is the water. The plate records the sea as
near-black navy — true to satellite data, murky on screen — so
`earthMaterial.ts` masks water pixels (blue-dominant and dark, which
excludes ice, cloud and land) and remaps only those through a deep →
sky-blue ramp driven by their original brightness, preserving the sea's
depth structure. Tune or disable it with `DEFAULT_OCEAN`:

```ts
export const DEFAULT_OCEAN = {
  deep: '#153a61',     // deepest water
  shallow: '#3a739f',  // brightest water
  amount: 0.5,         // 0 = untouched plate, 1 = fully regraded
};
```

At `amount: 0.5` the result is a half-blend with the supplied texture, so
the sea keeps the asset's own deep-navy character and only gains enough
lift to stay readable on screen. Raise it for a brighter, more
cartographic ocean; drop it to 0 to see the plate exactly as shipped.

The one thing drawn that is not from the plate is the thin blue rim glow
at the limb (`Atmosphere.tsx`), which gives the sphere an edge against
the black background. Delete `<Atmosphere />` from `GlobeScene.tsx` to
remove it entirely.

## Projection

Left edge is longitude −180°, top edge latitude +90°. This matches
`latLonToVector3` in `src/utils/geoCoordinates.ts`, which is why dataset
markers land on the correct coastlines.

## Regenerating from higher-resolution sources

```bash
sips -Z 6144 --setProperty format jpeg --setProperty formatOptions 76 LOP_earth_d.jpg --out earth-day.jpg
```

Raise `-Z` for sharper close zoom at the cost of download size and GPU
memory (a 6144-wide map is ~75 MB once uploaded to the GPU).
