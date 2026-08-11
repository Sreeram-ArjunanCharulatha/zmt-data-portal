# GeoData Commons — 3D dataset discovery

A premium scientific dataset-discovery interface built around a fully
interactive 3D globe. React + Vite + TypeScript + three.js
(`@react-three/fiber` / `@react-three/drei`), with a blue-and-white
research-repository identity, working search, faceted filtering and
genuine marker clustering.

No backend is required: the catalogue ships as realistic mock data.

---

## Installation

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

Other scripts:

```bash
npm run build
```

```bash
npm run typecheck
```

### Earth imagery

Two globe looks ship together:

- **Photographic** (`Globe`, `Satellite`) — real equirectangular satellite
  maps in `public/textures`, web-optimised from a supplied high-resolution
  Earth pack (21600 × 10800 down to 6144 × 3072; ~4.3 MB). Rendered
  **unlit**, so the artwork's own colours appear untouched — no lighting
  multiply, no specular sheen, no tint. See
  [`public/textures/README.md`](public/textures/README.md).
- **Drawn** (`World`, and the instant first paint of every style) — the
  basemap, clouds and every marker sprite are generated at runtime on a
  canvas from the coastline data in `src/data/worldLand.ts`.

The drawn globe renders on the first frame and the imagery swaps in when
it finishes downloading, so the scene is interactive immediately and never
shows a blank canvas. If the imagery fails to load — offline, blocked
network — the drawn globe simply stays, and the app keeps working.

---

## Component structure

```
src/
  components/
    Header/                 Blue app bar: nav, bookmark count, theme toggle, user menu
    SearchBar/              Large search field ("/" focuses, Esc blurs, clear button)
    SearchTabs/             All / Dataset / Keyword / Event + view toggle + advanced filters
    FilterSidebar/          Faceted filters, result count, map-style selector
    GlobeScene/             The 3D scene and everything that lives inside the canvas
      GlobeScene.tsx        Canvas, lighting, stars, tooltip, statistics, loading state
      Earth.tsx             Textured sphere + independently rotating cloud layer
      useEarthTextures.ts   Lazy loader/cache for the photographic maps
      Atmosphere.tsx        Fresnel rim-glow shader
      CameraRig.tsx         OrbitControls, viewport fitting, fly-to animations
      GlobeNodes.tsx        One per-frame loop: culling, scaling, screen-space declutter
      PlaceLabels.tsx       Country/city names that fade in with zoom
      CountryBorders.tsx    Natural Earth international boundaries
      earthMaterial.ts      Unlit earth material with ocean regrading
      SpriteNode.tsx        Shared billboard used by markers and clusters
      SceneLighting.tsx     Camera-relative key/fill lights
      GlobeErrorBoundary.tsx  Keeps the app usable if WebGL fails
    GlobeControls/          Zoom / reset / locate / auto-rotate / fullscreen + help card
    DatasetMarker/          Single-location marker
    DatasetCluster/         Numbered cluster disc
    DatasetDetailsCard/     Bottom card (bottom sheet on mobile)
    DatasetList/            Paginated card grid with sorting
    MobileFilterDrawer/     Slide-in filter sheet for narrow viewports
  hooks/
    useDatasetFilters.ts    Filtering + facet counts + per-tab counts
    useMarkerClustering.ts  Memoised clustering, keyed on quantised zoom level
    useGlobeCamera.ts       Imperative camera handle shared with the DOM controls
    useReducedMotion.ts     prefers-reduced-motion + generic media queries
  utils/
    geoMath.ts              Pure spherical maths (no three.js — keeps it out of the main bundle)
    geoCoordinates.ts       three.js bindings for the above
    clustering.ts           Distance clustering, zoom→threshold table, cluster tiers
    earthTexture.ts         Canvas-generated earth / cloud / sprite textures + disposal
  data/
    mockDatasets.ts         The catalogue (89 locations, normalised to 12,842 datasets)
    worldLand.ts            Coarse coastline rings used to paint the globe
    places.ts               Country/city label anchors, tiered by zoom
    countryBorders.json     Natural Earth 110m admin-0 boundary lines
  types/dataset.ts          Domain types
  styles/                   Design tokens + global reset
  App.tsx                   Layout, state, and the wiring between all of the above
```

### How the pieces fit together

`App.tsx` owns all application state (query, tab, facets, selection,
bookmarks, view mode, theme). `useDatasetFilters` turns that state into a
result set plus facet counts; `useMarkerClustering` turns the result set
plus the current zoom level into the nodes drawn on the globe. Everything
below is presentational, which is why filtering never rebuilds the scene —
only the marker group re-renders.

### Clustering

`utils/clustering.ts` is deliberately data-driven: no cluster position is
hard-coded. Locations are grouped greedily by great-circle distance,
seeded from the largest first so centroids stay stable while the user
moves the camera. The grouping radius comes from a quantised zoom level
(`cameraDistanceToZoomLevel` → `zoomLevelToThresholdDeg`, 30° when the
whole globe is in view down to 0° at maximum zoom), so clustering runs
only when the zoom step or the filters change — never per frame.

Cluster discs are tiered by dataset volume in blue shades only:

| Datasets | Tier | Appearance          |
| -------- | ---- | ------------------- |
| 1–10     | `xs` | small light blue    |
| 11–50    | `sm` | medium blue         |
| 51–200   | `md` | large primary blue  |
| 200+     | `lg` | largest, dark blue  |

Clicking a cluster flies the camera towards its centroid and shortens the
orbit radius, which lowers the zoom level and re-splits the group.

At the closest levels, a throttled screen-space pass in `GlobeNodes`
projects every node and hides any whose disc would overlap a larger one,
so the globe never turns into a wall of pins.

---

## Replacing the mock data with an API

Everything is typed against `DatasetLocation` (`src/types/dataset.ts`).
That type is the only contract the UI depends on.

1. **Add a loader.** Create `src/data/datasetSource.ts`:

   ```ts
   import type { DatasetLocation } from '../types/dataset';

   export async function fetchDatasets(): Promise<DatasetLocation[]> {
     const response = await fetch('/api/datasets');
     if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
     return (await response.json()) as DatasetLocation[];
   }
   ```

2. **Swap the import in `App.tsx`.** Replace the static
   `mockDatasets` import with state:

   ```ts
   const [datasets, setDatasets] = useState<DatasetLocation[]>([]);
   useEffect(() => {
     let cancelled = false;
     fetchDatasets().then((data) => !cancelled && setDatasets(data));
     return () => { cancelled = true; };
   }, []);
   ```

   then pass `datasets` (instead of `mockDatasets`) to `useDatasetFilters`.

3. **Map your fields.** If the API shape differs, normalise it in the
   loader rather than in components — `latitude`/`longitude` must be
   decimal degrees (WGS84), `format` an array, and `startDate`/`endDate`
   ISO `YYYY-MM-DD`.

4. **Server-side filtering (optional).** To push filtering to the
   backend, send the `DatasetFilters` object as query parameters and have
   the endpoint return `{ results, facets }`; then replace the body of
   `useDatasetFilters` with the response. The rest of the app — clustering,
   markers, counts, empty state — needs no changes.

5. **Catalogue total.** `TOTAL_CATALOGUE_SIZE` in `mockDatasets.ts`
   normalises the mock counts to 12,842. With a real API, delete
   `normaliseCounts` and use the counts the server returns.

---

## Behaviour notes

- **Globe fitting.** `CameraRig` computes the orbit distance that keeps a
  radius-1 sphere (plus a 1.32 margin) inside both the vertical and
  horizontal field of view, and recomputes it on every resize — including
  when the details card opens, when the sidebar collapses, and in
  fullscreen. The globe shrinks rather than being cropped.
- **Controls.** Drag to rotate, scroll/pinch to zoom, double-click any
  point to focus it, click clusters to drill in. Panning is disabled and
  the zoom range is clamped so the camera can never enter the globe.
- **Filtering moves the camera.** Narrowing the query (a region, an
  organisation, a search term) flies the globe to the weighted centroid of
  the surviving results and frames them by their angular spread. Automatic
  moves are clamped to 88% of the framing distance, so a filter can never
  zoom in far enough to crop the globe — only user-driven zoom does that.
- **Selecting a marker rotates only.** It deliberately does not change the
  orbit radius: changing zoom would cross a clustering threshold and
  rebuild the whole marker layer mid-click.
- **Atmosphere.** Exactly one halo in the scene. A fresnel term on an
  enlarged sphere peaks at *that sphere's* silhouette, which draws a hard
  ring rather than a fading glow, so `Atmosphere.tsx` instead measures
  each fragment's impact parameter (perpendicular distance from the eye
  ray to the planet's centre) and fades from the limb outwards to exactly
  zero. Intensity lives in one uniform (`uIntensity`, currently 0.42).
- **Boundaries.** International borders come from Natural Earth's 1:110m
  admin-0 boundary lines, reduced to bare coordinates (40 KB). Long
  straight spans are subdivided along the great circle so they hug the
  sphere instead of cutting through it, and the lines are depth-tested so
  the globe itself hides the far side.
- **Drag speed scales with altitude**, like Google Earth: close in, a
  drag moves the surface with the pointer instead of whipping past it.
- **Place names appear with zoom.** Country names fade in one zoom step
  past the default framing and cities two steps past that, in tiers, so
  the globe fills in gradually (`src/data/places.ts`). Names are baked to
  canvas sprites — no font loading — and a screen-space pass drops any
  name that would collide with a more important one, countries winning
  over cities.
- **Auto-rotate** starts on and pauses on the first user interaction or
  selection; the toggle restarts it.
- **Reduced motion.** `prefers-reduced-motion` disables cloud drift,
  auto-rotation, star drift and camera easing (jumps become instant), and
  CSS transitions are collapsed globally.
- **Keyboard & screen readers.** Skip link, semantic landmarks, ARIA tabs
  and dialogs, visible focus rings, `srOnly` text on every icon-only
  button, and Escape closes the drawer, menus, details card and
  fullscreen.
- **Performance.** Device pixel ratio is capped at 1.75, the globe chunk
  is code-split (245 kB initial vs. 859 kB globe), textures are cached and
  disposed on unmount, geometry is disposed explicitly, marker work runs
  in a single per-frame loop, and clustering is memoised on the quantised
  zoom level.
