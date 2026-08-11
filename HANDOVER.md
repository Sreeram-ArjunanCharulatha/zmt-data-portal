# ZMT Data Portal — Handover Document

## 1. Project Goal & Current Status

A polished desktop/mobile web UI for the **"ZMT Data Portal"** — a marine/scientific dataset discovery front-end for the Leibniz Centre for Tropical Marine Research (ZMT), Bremen. It is a **frontend-only demo/prototype**: no backend, no real API, all data is a local mock catalogue. Users search/filter datasets and browse them either on a 3D interactive globe (clustered markers) or as a flat list.

**Status:** Feature-complete per the latest design brief (ZMT-blue header, centered nav, search bar + filters, category pills, marine-blue globe workspace with giant translucent "ZMT" wordmark behind the Earth, cyan sonar-style markers, edge-mounted "Datasets" tab, bottom-right "ZMT Globe" control dock, bottom-center stats capsule, dark glass panels for filters/details/drawer). Production build (`npm run build`) passes with no errors. Verified in-browser at both desktop (1440px) and mobile (390px) widths.

No git repository is initialized in this project (`git status` not applicable — confirm before assuming version control exists).

## 2. Tech Stack & Architecture

- **React 18 + TypeScript**, built with **Vite 5** (`@vitejs/plugin-react`)
- **@react-three/fiber 8** + **@react-three/drei 9** + **three.js 0.169** for the 3D globe scene
- **CSS Modules** everywhere (`*.module.css`), no CSS-in-JS, no Tailwind
- **lucide-react** for icons
- No routing library (single-page, no router) — state-driven view switching only
- No backend, no database, no API calls, no environment variables. `mockDatasets.ts` is the only data source.
- No test framework configured (no test files, no test script in `package.json`)

### Data flow
`mockDatasets` (static array) → `useDatasetFilters` (client-side filter/facet/search) → `results` → `useMarkerClustering` (distance-based clustering, driven by camera zoom level) → `nodes` (ClusterNode[]) → rendered as sprites on the globe (`GlobeNodes.tsx`) or rows in `DatasetList`.

## 3. Important Files & Folders

```
src/
  App.tsx                          — root component; all top-level state, layout composition
  App.module.css                   — app shell layout (header/search/tabs/main/sidebarSlot/stage)
  main.tsx                         — ReactDOM entry point
  styles/
    variables.css                  — ALL design tokens (colors, spacing, radii, fonts, shadows);
                                      light theme in :root, dark overrides in [data-theme='dark']
    global.css                     — resets, base element styles
  types/dataset.ts                 — domain types: DatasetLocation, DatasetFilters, ClusterNode, etc.
  data/
    mockDatasets.ts                — generated mock catalogue + REPOSITORIES/REGIONS/DATA_TYPES/
                                      LICENSES lists + TOTAL_CATALOGUE_SIZE, YEAR_MIN, YEAR_MAX
    places.ts, worldLand.ts, countryBorders.json — geography reference data for the globe
  hooks/
    useDatasetFilters.ts           — pure client-side search/filter/facet logic
    useMarkerClustering.ts         — wraps utils/clustering.ts, keyed by zoom level
    useGlobeCamera.ts              — imperative camera control handle (zoom/pan/reset/flyTo)
    useReducedMotion.ts            — also exports useMediaQuery (used for isCompact breakpoint)
  utils/
    clustering.ts                  — clustering algorithm + zoom↔threshold mapping + tier styling
    geoMath.ts                     — angularDistanceDeg, geographicCentroid (spherical geometry)
    geoCoordinates.ts              — lat/long <-> 3D vector conversions
    earthTexture.ts                — canvas-drawn marker sprite textures (sonar rings look)
  components/
    Header/                        — top masthead: logo, nav, theme + profile controls
    SearchBar/                     — white rounded search bar, Filters button, Search button
    SearchTabs/                    — All/Dataset/Keyword/Event pills + Globe/List view switch
    FilterSidebar/                 — desktop filter panel (also embedded in MobileFilterDrawer)
    MobileFilterDrawer/            — full-height mobile filter sheet (<720px)
    GlobeScene/
      GlobeScene.tsx               — R3F <Canvas> host; wordmark layer; stats capsule; tooltip
      useFitWordmark.ts            — Canvas2D measureText-based auto-sizing hook for "ZMT" wordmark
      Earth.tsx, earthMaterial.ts, useEarthTextures.ts — the 3D globe mesh/material
      GlobeNodes.tsx                — renders all marker sprites, raycasting, visible-count tracking
      SpriteNode.tsx                — single marker sprite
      Atmosphere.tsx, CountryBorders.tsx, PlaceLabels.tsx, SceneLighting.tsx, CameraRig.tsx
      GlobeErrorBoundary.tsx       — catches WebGL/render errors
    GlobeControls/                 — bottom-right "ZMT Globe" control dock + help card
    ClusterPanel/                  — popover listing datasets inside a clicked cluster
    DatasetDetailsCard/            — panel/bottom-sheet for a selected dataset
    DatasetList/, DatasetMarker/, DatasetCluster/ — list-view rendering
index.html, vite.config.ts, tsconfig.json, package.json
```

## 4. Features Completed

- Search (free text) + faceted filters (repository, region, country, data type, format, license, year range) with live facet counts
- Category tabs (All/Dataset/Keyword/Event) with counts, synced to filters
- Globe view: 3D Earth, clustered cyan "sonar" markers (rings + glow + count labels), click-to-zoom, drag-to-rotate, auto-rotate toggle, zoom/pan/reset/locate-me/fullscreen controls, help card
- List view: flat sortable dataset rows, inset layout when sidebar is open
- Dataset selection → camera fly-to + details card/bottom-sheet with bookmark, external link, close
- Cluster click → popover list of member datasets
- Responsive: desktop column sidebar / mobile full-height drawer (breakpoint `1080px` via `isCompact`), further breakpoints at `900px`, `720px`, `560px`, `480px`
- Light/dark theme toggle, persisted to `localStorage` (`zmt-theme`)
- Geolocation "locate me" button (uses `navigator.geolocation`)
- Empty-state UI with "reset filters" CTA
- Toast notifications (auto-dismiss after 3.2s)
- Giant translucent "ZMT" wordmark behind the globe, auto-fitted to container size via Canvas2D text measurement (`useFitWordmark`)
- Bottom-center stats capsule: Mapped/Catalogue, Markers, Currently Visible (live, throttled to every 0.2s from the R3F render loop)
- Edge-mounted "Datasets" tab (replaces old floating sidebar toggle)
- Dark glass-panel theming applied consistently to FilterSidebar, DatasetDetailsCard, MobileFilterDrawer, ClusterPanel via scoped CSS-variable overrides

## 5. Current Bugs/Issues

**None currently open and confirmed.** Two items were investigated and fixed in the most recent session (see §6). If new visual regressions appear, check responsive breakpoints first — several fixed-px offsets (e.g. dock clearance for the stats capsule) are viewport-width-sensitive and were previously a source of bugs.

Known **fragile spots** worth watching, not necessarily bugs:
- Automated browser-tool clicks directly on canvas coordinates are unreliable for this WebGL scene (see §8) — always prefer DOM buttons/list items when testing programmatically.
- The stats capsule's mobile clearance from the control dock (`128px` right inset, see §9) is a hand-tuned magic number, not a computed value — if dock width or button count changes, re-check for overlap at ≤480px widths.

## 6. Recent Changes (most recent session)

1. **Redesign per full brand brief** (ZMT-blue header, Avenir-style type, wide search bar, category pills, marine-blue workspace gradient, giant "ZMT" wordmark, sonar markers, edge Datasets tab, navy control dock, stats capsule, dark glass panels). Touched: `variables.css`, `App.tsx`, `App.module.css`, `Header.module.css`, `GlobeControls.tsx`/`.module.css`, `GlobeScene.tsx`/`.module.css`, `GlobeNodes.tsx`, `earthTexture.ts`, `clustering.ts` (`TIER_STYLE`), `FilterSidebar.module.css`, `DatasetDetailsCard.module.css`, `MobileFilterDrawer.module.css`. New file: `useFitWordmark.ts`.
2. **Fixed:** wordmark rendering as invisible/clipped color blocks — root cause was fixed-percentage font sizing (`46vw`/`46cqi`) overflowing its container; replaced with `useFitWordmark`, which measures real glyph metrics via `Canvas2D.measureText()` and sets `font-size` imperatively, re-measuring on `ResizeObserver`.
3. **Fixed:** sonar marker rings blending into a single blur — shrank the glow/bloom radius close to the marker body and pushed the echo rings further out with higher contrast/thicker strokes (`earthTexture.ts` → `createNodeSprite`).
4. **Fixed (this session, in response to explicit bug report "earth shift flicker after close filter")** — re-verified, not re-fixed: confirmed `.sidebarSlot` in `App.module.css` is `position: absolute` (floats over `.stage`, does not participate in flex flow), so opening/closing the filter panel never resizes the `<canvas>`. Measured canvas `getBoundingClientRect()` before/during/after open+close — constant `1400×608` throughout. **This is the existing fix that prevents the flicker; it was not modified, only confirmed intact.**
5. **Fixed (this session):** mobile stats capsule overlapping the bottom-right globe control dock at narrow viewports (390px). Root cause: `.stats { max-width: min(520px, calc(100% - 2 * (var(--sidebar-width) + var(--space-6)))) }` used a 300px sidebar-based clearance doubled on both sides — meaningless for a right-only dock, went negative/ineffective on narrow screens. Fix in `GlobeScene.module.css`:
   - Base rule: `max-width: min(520px, calc(100% - 200px))`
   - `@media (max-width: 720px)`: switched from `left:50%; transform:translateX(-50%)` centering to `left: var(--space-3); right: 128px; transform: none; width: fit-content; margin: 0 auto; justify-content: center;` — centers the capsule within the space left of the dock instead of the full viewport.
   - Verified via `getBoundingClientRect()`: went from an 8px overlap to a 50px gap at 390×844.

## 7. Important Design/UI Decisions

- **Official ZMT brand color:** `--primary-blue: #008eca` (RGB 0,142,202) — do not change without explicit instruction.
- **Scoped CSS-variable override pattern** is the standard way to re-theme a component for the dark glass-panel look: redefine generic tokens (`--surface`, `--text`, `--accent`, etc.) inside the component's root class so all descendant rules (which already read those generic tokens) cascade automatically. Used in `FilterSidebar`, `DatasetDetailsCard`, `MobileFilterDrawer`. **Follow this pattern for any new floating panel** rather than writing bespoke dark-mode rules per element.
- **`.sidebarSlot` must stay `position: absolute`**, floating over `.stage`. This is the deliberate architectural fix for canvas-resize flicker (see comment at `App.module.css:41-44`). Reverting to an in-flow flex sidebar will reintroduce the flicker bug.
- Wordmark sizing must use `useFitWordmark` (measured), never a fixed `vw`/`cqi` percentage — that approach is proven broken (renders as clipped color blocks, not legible text).
- One member = one deposited dataset (see `types/dataset.ts` doc comment) — cluster counts are always literal, never a display multiplier. Don't introduce weighted/aggregate cluster counts.
- Sonar marker aesthetic: tight bright core + close bloom + well-separated, higher-contrast echo rings further out. Don't let bloom and rings occupy the same radius band (that's what caused the earlier "blurred blob" bug).
- Stats capsule is deliberately **smaller/lighter** than the control dock — don't give it equal visual weight.
- `isCompact` breakpoint (`1080px`, via `useMediaQuery` in `useReducedMotion.ts`) is the single source of truth for "mobile drawer vs desktop column" — don't add a second breakpoint definition for the same decision.

## 8. APIs, Database, Endpoints, Environment Variables, Integrations

**None.** This is a fully static frontend:
- No `.env` file, no `import.meta.env.VITE_*` usage anywhere in `src/`
- No `fetch`/`axios`/network calls in the app code
- `mailto:research-data@leibniz-zmt.de` is the only external reference (a static link)
- Footer links ("Data policy", "API", "FAQ", "Imprint") are placeholder `#main` anchors — not wired to anything
- If real backend integration is ever added, `useDatasetFilters.ts` and `mockDatasets.ts` are the natural seams to replace with API calls.

## 9. Critical Code Logic — Do Not Change Without Care

- **`App.module.css` `.sidebarSlot` / `.stage`** — absolute-positioned overlay pattern preventing globe canvas resize/flicker. See §7.
- **`useFitWordmark.ts`** — the only correct way to size the "ZMT" wordmark. Uses an offscreen `<canvas>` + `ctx.measureText()` at a fixed `MEASURE_FONT_SIZE = 200` reference, scales proportionally to fit `widthFraction` (default `0.94`) of container width or `maxHeightFraction` (default `0.82`) of container height, whichever is smaller.
- **`GlobeNodes.tsx` visible-count throttling** — `VISIBLE_COUNT_INTERVAL = 0.2` (seconds) via a `useFrame` clock accumulator; only calls `onVisibleCountChange` when the count actually changes. Removing the throttle would cause a React re-render every WebGL frame.
- **`clustering.ts` `clusterLocations`** — greedy agglomerative, seeded by locations sorted by `id` (deterministic, stable across re-renders as long as the same points survive filtering). Cluster `id` is derived from sorted member ids (`cluster-${...}`), which is what keeps React keys — and therefore animations/selection state — stable across re-clustering. Don't change the id derivation without checking downstream consumers (`ClusterPanel`, selection logic).
- **`GlobeScene.module.css` `.stats` positioning** — see §6 item 5; the `128px`/`200px` clearance values are tied to the current control-dock width/button count. If the dock's button set changes, re-verify no overlap at ≤480px.

## 10. Thresholds / Config Values Currently Used

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `MIN_CAMERA_DISTANCE` | `1.62` | `clustering.ts` | Closest zoom |
| `MAX_CAMERA_DISTANCE` | `4.2` | `clustering.ts` | Furthest zoom |
| `ZOOM_LEVELS` | `7` | `clustering.ts` | Discrete zoom quantization steps |
| zoom→threshold table | `[30, 22, 16, 11, 7, 4, 0]` (degrees) | `clustering.ts` `zoomLevelToThresholdDeg` | Clustering radius per zoom level |
| cluster tiers | `xs ≤3`, `sm ≤10`, `md ≤25`, `lg >25` datasets | `clustering.ts` `clusterTier` | Marker size/color tier |
| `CLOSE_UP_DISTANCE` | `1.72` | `App.tsx` | Camera distance when a single dataset is opened |
| filter-driven camera distance | `clamp(1.85, 1.85 + spreadDeg/90*1.75, 3.6)` | `App.tsx` `focus` memo | Frames filtered result spread |
| `isCompact` breakpoint | `max-width: 1080px` | `App.tsx` via `useMediaQuery` | Mobile drawer vs desktop sidebar |
| responsive CSS breakpoints | `900px`, `720px`, `560px`, `480px` | various `.module.css` | Component-level responsive tweaks |
| `VISIBLE_COUNT_INTERVAL` | `0.2` sec | `GlobeNodes.tsx` | Throttle for live visible-marker count |
| wordmark `widthFraction` / `maxHeightFraction` | `0.94` / `0.82` | `useFitWordmark.ts` default params | How much of the container the "ZMT" text fills |
| toast auto-dismiss | `3200` ms | `App.tsx` | Toast visibility duration |
| geolocation timeout | `8000` ms | `App.tsx` `handleLocate` | `navigator.geolocation.getCurrentPosition` timeout |
| stats capsule dock clearance | `200px` (desktop), `128px` right inset (≤720px) | `GlobeScene.module.css` | Prevents overlap with control dock |
| primary brand blue | `#008eca` (RGB 0,142,202) | `variables.css` | Official ZMT color — fixed |

## 11. Pending Tasks & Recommended Next Steps

- No explicit open feature requests remain from the last brief — all items were implemented.
- Recommended before calling this "done":
  1. Re-run the flicker check after any future change to `.sidebarSlot`, `.stage`, or the globe's `<Canvas>` sizing — it's a regression-prone area.
  2. Consider adding a lightweight visual regression test or at least a manual QA checklist for the 390px/720px/900px/1080px breakpoints, since two of the last three bugs found were breakpoint-specific overlaps.
  3. No test suite exists — if this moves toward production, add component/unit tests (currently zero test files, zero test tooling installed).
  4. No git repo is initialized — consider running `git init` if version history is wanted.
  5. Footer links (`Data policy`, `API`, `FAQ`, `Imprint`) are placeholders; wire them up or remove before shipping.

## 12. Things Tried That Failed — Do Not Repeat

- **Sizing the "ZMT" wordmark with `vw`/`cqi` percentage units** (e.g. `46vw`, `46cqi`) — looked correct in computed styles but rendered as oversized, clipped, unrecognizable color blocks because the guessed percentage overflowed the container and got clipped by `overflow: hidden`. Always use `useFitWordmark`'s measured approach instead.
- **`container-type: inline-size` on `.wrapper`** for the globe scene — added to support `cqi` units, then removed once the measured-sizing approach made it unnecessary. Don't re-add without a concrete reason.
- **Driving the WebGL canvas via synthetic `PointerEvent` dispatch** (`canvas.dispatchEvent(new PointerEvent(...))`) to test marker/cluster clicks programmatically — does not reliably trigger react-three-fiber's raycasting-based `onClick`/`onSelectCluster` handlers. Use real DOM button clicks (list view rows, toolbar buttons) for automated testing instead.
- **Automated browser-tool `left_click` at canvas pixel coordinates** — times out repeatedly (~30s), likely because the continuous R3F render loop prevents "network idle"-style heuristics from resolving. Prefer DOM-based interaction paths when scripting UI checks against this app.
- **Stats capsule `max-width` computed from `--sidebar-width` (300px), doubled for "both sides"** — wrong model for a dock that only encroaches from one side (right); went negative/ineffective on narrow viewports. Fixed as described in §6/§9 — don't reintroduce a sidebar-width-based formula for this element.

## 13. Exact Commands to Run Locally

```bash
cd /Users/acruxcamelot/AC/claude/geo-dataset-discovery
npm install        # first time only / after dependency changes
npm run dev        # starts Vite dev server at http://localhost:5173 (port fixed in vite.config.ts)
```

Other scripts:
```bash
npm run build       # tsc -b && vite build -> outputs to dist/
npm run preview     # serve the production build locally
npm run typecheck   # tsc --noEmit, no build output
```

No environment variables or `.env` file are required. No database or external service needs to be running.

---

## STARTING PROMPT FOR NEW CHAT

```
I'm continuing work on the "ZMT Data Portal" project at
/Users/acruxcamelot/AC/claude/geo-dataset-discovery — a React + TypeScript +
Vite frontend using @react-three/fiber for a 3D globe dataset-discovery UI
for a marine research institute (ZMT). It's frontend-only: no backend, no
API, no database, no env vars — all data comes from src/data/mockDatasets.ts.

Before doing anything, read HANDOVER.md in the project root in full — it has
the complete architecture, file map, completed features, recent changes,
critical "do not change" logic (especially the .sidebarSlot absolute-
positioning fix that prevents globe canvas flicker, and the useFitWordmark
measured-sizing approach for the giant "ZMT" wordmark behind the globe),
current config/threshold values, and a list of approaches that were already
tried and failed (don't repeat those — e.g. don't size the wordmark with
vw/cqi units, don't use synthetic PointerEvents to test canvas clicks, don't
click canvas pixel coordinates with browser automation tools — use DOM
buttons instead).

Run `npm run dev` to start the dev server at http://localhost:5173 and use
the Browser preview tools to verify any UI change visually before reporting
it done, including at mobile widths (this app has had two overlap bugs at
narrow viewports already).

[Describe the new task/bug/feature here.]
```
