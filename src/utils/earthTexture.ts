import * as THREE from 'three';
import {
  GRATICULE_STEP,
  INLAND_WATER_RINGS,
  LAND_RINGS,
  type Ring,
} from '../data/worldLand';
/* The drawn basemap is only a stand-in for the photographic globe now,
   but the palettes are kept so it can be revived if needed. */
export type DrawnStyle = 'globe' | 'satellite' | 'world';

/* ------------------------------------------------------------------ *
 * Runtime-generated equirectangular textures.
 *
 * Painting the earth on a canvas keeps the app asset-free (no CDN, no
 * binary images in the repo, works offline) while still giving real
 * continents, real oceans and a per-map-style palette.
 *
 * Every texture created here is cached and disposed through
 * `disposeGeneratedTextures()`.
 * ------------------------------------------------------------------ */

/* 4k equirectangular keeps coastlines crisp at maximum zoom. */
const TEX_WIDTH = 4096;
const TEX_HEIGHT = 2048;

type Palette = {
  oceanDeep: string;
  oceanShallow: string;
  landBase: string;
  landPolar: string;
  landArid: string;
  landTropical: string;
  coast: string;
  graticule: string;
};

const PALETTES: Record<DrawnStyle, Palette> = {
  globe: {
    oceanDeep: '#0a3a63',
    oceanShallow: '#12699f',
    landBase: '#b4cfe1',
    landPolar: '#eaf4fa',
    landArid: '#d8ceb2',
    landTropical: '#a3c6b8',
    coast: '#5a8cae',
    graticule: 'rgba(160, 205, 235, 0.13)',
  },
  satellite: {
    oceanDeep: '#073055',
    oceanShallow: '#0d5385',
    landBase: '#3d6b45',
    landPolar: '#e9f1f5',
    landArid: '#c2a86e',
    landTropical: '#2f6b3c',
    coast: '#89a98d',
    graticule: 'rgba(180, 215, 240, 0.08)',
  },
  world: {
    oceanDeep: '#0a3a60',
    oceanShallow: '#12689f',
    landBase: '#eef5f9',
    landPolar: '#ffffff',
    landArid: '#f4efe2',
    landTropical: '#e4eee7',
    coast: '#7fa8c2',
    graticule: 'rgba(215, 235, 250, 0.2)',
  },
};

const lonToX = (lon: number) => ((lon + 180) / 360) * TEX_WIDTH;
const latToY = (lat: number) => ((90 - lat) / 180) * TEX_HEIGHT;

function tracePath(ctx: CanvasRenderingContext2D, ring: Ring) {
  ctx.beginPath();
  ring.forEach(([lon, lat], i) => {
    const x = lonToX(lon);
    const y = latToY(lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

/** Latitude-banded tint applied only where land was painted. */
function paintLandBands(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  strength: number,
) {
  ctx.globalCompositeOperation = 'source-atop';
  const grad = ctx.createLinearGradient(0, 0, 0, TEX_HEIGHT);
  grad.addColorStop(0.0, palette.landPolar);
  grad.addColorStop(0.14, palette.landPolar);
  grad.addColorStop(0.24, palette.landBase);
  grad.addColorStop(0.36, palette.landArid);
  grad.addColorStop(0.5, palette.landTropical);
  grad.addColorStop(0.62, palette.landArid);
  grad.addColorStop(0.74, palette.landBase);
  grad.addColorStop(0.9, palette.landPolar);
  grad.addColorStop(1.0, palette.landPolar);
  ctx.globalAlpha = strength;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** Deterministic value noise so textures look identical across reloads. */
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function paintSpeckle(
  ctx: CanvasRenderingContext2D,
  count: number,
  alpha: number,
  seed = 7,
) {
  const rand = seededRandom(seed);
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < count; i += 1) {
    const x = rand() * TEX_WIDTH;
    const y = rand() * TEX_HEIGHT;
    const r = 1 + rand() * 3.5;
    ctx.fillStyle =
      rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

const textureCache = new Map<string, THREE.Texture>();

export function createEarthTexture(style: DrawnStyle): THREE.Texture {
  const cacheKey = `earth-${style}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const palette = PALETTES[style];
  const { canvas, ctx } = makeCanvas(TEX_WIDTH, TEX_HEIGHT);

  /* --- Ocean ------------------------------------------------------ */
  const ocean = ctx.createLinearGradient(0, 0, 0, TEX_HEIGHT);
  ocean.addColorStop(0, palette.oceanDeep);
  ocean.addColorStop(0.3, palette.oceanShallow);
  ocean.addColorStop(0.5, palette.oceanShallow);
  ocean.addColorStop(0.7, palette.oceanShallow);
  ocean.addColorStop(1, palette.oceanDeep);
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

  /* Faint bathymetry banding so oceans are not perfectly flat. */
  const rand = seededRandom(23);
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
    ctx.beginPath();
    ctx.ellipse(
      rand() * TEX_WIDTH,
      rand() * TEX_HEIGHT,
      60 + rand() * 220,
      30 + rand() * 90,
      rand() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* --- Graticule -------------------------------------------------- */
  ctx.strokeStyle = palette.graticule;
  ctx.lineWidth = 2.5;
  for (let lon = -180; lon <= 180; lon += GRATICULE_STEP) {
    ctx.beginPath();
    ctx.moveTo(lonToX(lon), 0);
    ctx.lineTo(lonToX(lon), TEX_HEIGHT);
    ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += GRATICULE_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, latToY(lat));
    ctx.lineTo(TEX_WIDTH, latToY(lat));
    ctx.stroke();
  }

  /* --- Land (offscreen so tinting only touches landmasses) -------- */
  const land = makeCanvas(TEX_WIDTH, TEX_HEIGHT);
  land.ctx.fillStyle = palette.landBase;
  LAND_RINGS.forEach((ring) => {
    tracePath(land.ctx, ring);
    land.ctx.fill();
  });
  paintLandBands(land.ctx, palette, style === 'satellite' ? 0.85 : 0.7);
  paintSpeckle(land.ctx, style === 'satellite' ? 2600 : 900, 0.05);

  /* Coastline stroke on top of the tinted land. */
  land.ctx.strokeStyle = palette.coast;
  land.ctx.lineWidth = 3.5;
  land.ctx.lineJoin = 'round';
  LAND_RINGS.forEach((ring) => {
    tracePath(land.ctx, ring);
    land.ctx.stroke();
  });

  ctx.drawImage(land.canvas, 0, 0);

  /* --- Inland seas ------------------------------------------------ */
  ctx.fillStyle = palette.oceanShallow;
  ctx.strokeStyle = palette.coast;
  ctx.lineWidth = 3;
  INLAND_WATER_RINGS.forEach((ring) => {
    tracePath(ctx, ring);
    ctx.fill();
    ctx.stroke();
  });

  /* --- Polar ice --------------------------------------------------- *
   * Equirectangular pixels converge to a point at the poles, so the
   * generalised coastline rings fan into visible wedges there. Capping
   * both poles with graded sea ice hides the convergence and is closer
   * to the truth than open water anyway.
   * ----------------------------------------------------------------- */
  const arctic = ctx.createLinearGradient(0, 0, 0, latToY(66));
  arctic.addColorStop(0, palette.landPolar);
  arctic.addColorStop(0.55, palette.landPolar);
  arctic.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = arctic;
  ctx.fillRect(0, 0, TEX_WIDTH, latToY(66));

  const antarctic = ctx.createLinearGradient(0, TEX_HEIGHT, 0, latToY(-63));
  antarctic.addColorStop(0, palette.landPolar);
  antarctic.addColorStop(0.6, palette.landPolar);
  antarctic.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = antarctic;
  ctx.fillRect(0, latToY(-63), TEX_WIDTH, TEX_HEIGHT - latToY(-63));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/** Soft, sparse cloud band texture with transparency. */
export function createCloudTexture(): THREE.Texture {
  const cacheKey = 'clouds';
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const { canvas, ctx } = makeCanvas(1024, 512);
  ctx.clearRect(0, 0, 1024, 512);
  const rand = seededRandom(91);

  for (let i = 0; i < 240; i += 1) {
    const y = rand() * 512;
    /* Denser bands near the ITCZ and mid latitudes, thin at the poles. */
    const latFactor = Math.abs(y / 512 - 0.5) * 2;
    if (rand() < latFactor * 0.55) continue;
    const x = rand() * 1024;
    const rx = 18 + rand() * 70;
    const ry = 8 + rand() * 22;
    const alpha = 0.1 + rand() * 0.3;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Circular marker/cluster sprite. Labels are baked into the texture so
 * the scene needs no font loading and no DOM overlay per marker.
 */
/**
 * Sonar-inspired marker: concentric echo rings around a lit body, like a
 * ping on a marine sonar display. Single locations are clean sonar
 * points (bright core, no label); clusters carry their exact count.
 * Selected nodes get a visibly stronger ring and glow — every other
 * marker keeps full, unfaded visibility, per spec.
 */
export function createNodeSprite(options: {
  label: string;
  fill: string;
  ring: string;
  text: string;
  selected: boolean;
  isCluster: boolean;
}): THREE.Texture {
  const { label, fill, ring, text, selected, isCluster } = options;
  const cacheKey = `sonar-${label}-${fill}-${selected}-${isCluster}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 320;
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  const bodyRadius = isCluster ? size * 0.29 : size * 0.23;

  /* --- Marine glow wash ----------------------------------------------
   * A tight bloom hugging the body only — kept well short of where the
   * echo rings start, so the two read as separate layers instead of
   * one soft blur. */
  const bloomRadius = bodyRadius * (selected ? 1.55 : 1.36);
  const bloom = ctx.createRadialGradient(c, c, bodyRadius * 0.6, c, c, bloomRadius);
  bloom.addColorStop(0, ring);
  bloom.addColorStop(1, 'rgba(111, 224, 240, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(c, c, bloomRadius, 0, Math.PI * 2);
  ctx.fill();

  /* --- Sonar echo rings ---------------------------------------------
   * Distinct concentric strokes expanding outward from the body —
   * spaced apart and drawn with real contrast, not folded into the
   * bloom above, so this reads as layered "pings" rather than a single
   * fuzzy halo. Selected nodes get one extra, brighter ring. */
  const ringCount = selected ? 4 : 3;
  const ringStart = bodyRadius * 1.42;
  const ringEnd = size * (selected ? 0.49 : 0.435);
  const ringGap = (ringEnd - ringStart) / (ringCount - 1 || 1);
  for (let i = 0; i < ringCount; i += 1) {
    const radius = ringStart + ringGap * i;
    const t = ringCount > 1 ? i / (ringCount - 1) : 0;
    /* Dialled back from 0.62/0.46. The rings still read as layered
       sonar echoes, but at the previous alpha a globe full of markers
       added up to an overall cyan haze — the single biggest contributor
       to the interface reading as a game HUD rather than a chart. */
    const baseAlpha = selected ? 0.46 : 0.3;
    ctx.strokeStyle = `rgba(111, 224, 240, ${(baseAlpha * (1 - t * 0.78)).toFixed(3)})`;
    ctx.lineWidth = size * (selected ? 0.011 : 0.0085);
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (selected) {
    /* A stronger, closer ring dedicated to the selection state, on top
       of (not instead of) the ordinary sonar rings above. */
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.arc(c, c, bodyRadius + size * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* --- Body: dark contact shadow first, so the disc holds contrast
     over both pale desert and dark ocean textures --------------------- */
  ctx.save();
  ctx.shadowColor = 'rgba(2, 16, 30, 0.8)';
  ctx.shadowBlur = size * 0.055;
  ctx.shadowOffsetY = size * 0.01;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(c, c, bodyRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* Bright cyan collar, then a thin dark keyline for edge contrast. */
  ctx.strokeStyle = 'rgba(210, 250, 255, 0.95)';
  ctx.lineWidth = size * 0.032;
  ctx.beginPath();
  ctx.arc(c, c, bodyRadius - size * 0.014, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(4, 26, 46, 0.6)';
  ctx.lineWidth = size * 0.01;
  ctx.beginPath();
  ctx.arc(c, c, bodyRadius + size * 0.011, 0, Math.PI * 2);
  ctx.stroke();

  if (isCluster) {
    ctx.fillStyle = text;
    ctx.font = `700 ${size * (label.length > 3 ? 0.155 : 0.2)}px ${
      'Inter, system-ui, -apple-system, sans-serif'
    }`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, c, c + size * 0.006);
  } else {
    /* Single locations: a bright sonar core with its own hot centre,
       rather than a flat dot. */
    const core = ctx.createRadialGradient(c, c, 0, c, c, bodyRadius * 0.42);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.55, 'rgba(255,255,255,0.95)');
    core.addColorStop(1, 'rgba(210,250,255,0.35)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c, c, bodyRadius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

/* ------------------------------------------------------------------ *
 * Place-name labels.
 *
 * Text is baked to a canvas rather than rendered with a font-loading
 * text engine: no network fetch, no extra dependency, and the result is
 * a plain sprite that billboards for free.
 * ------------------------------------------------------------------ */

export type LabelTexture = {
  texture: THREE.Texture;
  /** width / height of the baked canvas, used to scale the sprite. */
  aspect: number;
};

const labelCache = new Map<string, LabelTexture>();

export function createLabelTexture(
  text: string,
  kind: 'country' | 'city',
): LabelTexture {
  const cacheKey = `${kind}:${text}`;
  const cached = labelCache.get(cacheKey);
  if (cached) return cached;

  /* Mixed case, light weight, subtle shadow — the map-label convention
     Google Earth uses, rather than tracked-out capitals. */
  const isCountry = kind === 'country';
  const fontSize = isCountry ? 44 : 38;
  const font = `${isCountry ? 500 : 400} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
  const label = text;
  const tracking = isCountry ? 0.5 : 0;

  /* Measure on a scratch context before sizing the real one. */
  const measureCanvas = makeCanvas(8, 8);
  measureCanvas.ctx.font = font;
  const textWidth =
    measureCanvas.ctx.measureText(label).width + tracking * label.length;

  const padding = 28;
  const dotSpace = isCountry ? 0 : 26;
  const width = Math.ceil(textWidth + padding * 2 + dotSpace);
  const height = 104;
  const { canvas, ctx } = makeCanvas(width, height);

  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const startX = padding + dotSpace;
  const centreY = height / 2;

  if (!isCountry) {
    /* Small locator dot ahead of city names. */
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(padding + 8, centreY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Soft drop shadow keeps names legible over bright desert and dark
     sea alike, without the heavy outline that reads as a game HUD. */
  ctx.shadowColor = 'rgba(0, 6, 14, 0.9)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 1.5;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(0, 8, 18, 0.35)';
  ctx.fillStyle = isCountry ? 'rgba(255,255,255,0.97)' : 'rgba(232,243,251,0.9)';

  if (tracking > 0) {
    let x = startX;
    for (const char of label) {
      ctx.strokeText(char, x, centreY);
      ctx.fillText(char, x, centreY);
      x += ctx.measureText(char).width + tracking;
    }
  } else {
    ctx.strokeText(label, startX, centreY);
    ctx.fillText(label, startX, centreY);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const entry: LabelTexture = { texture, aspect: width / height };
  labelCache.set(cacheKey, entry);
  return entry;
}

/** Frees every cached canvas texture. Called when the scene unmounts. */
export function disposeGeneratedTextures() {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
  labelCache.forEach((entry) => entry.texture.dispose());
  labelCache.clear();
}
