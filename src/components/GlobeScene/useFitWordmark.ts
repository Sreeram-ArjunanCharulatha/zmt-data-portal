import { useEffect, useRef, useState } from 'react';

// Sizes the "ZMT" watermark so it actually spans edge-to-edge.
//
// The first version of this guessed a fixed `vw`/`cqi` font-size, and it
// broke the moment real glyph metrics didn't match the guess: three
// capital letters in a bold geometric sans render wider than a naive
// per-glyph estimate, so the guessed percentage overflowed the stage
// and got clipped — which looks like solid colour blocks, not letters,
// because what's left visible is a zoomed-in slice of a single stroke.
//
// Canvas2D's `measureText` reports the real metrics for whatever font
// the browser actually resolved (Avenir Next on a Mac, Century Gothic
// on Windows, Inter as a last resort), so this measures once per
// container size/font and solves for the font-size that hits the target
// exactly, instead of guessing.

const MEASURE_FONT_SIZE = 200;

export function useFitWordmark(
  text: string,
  fontFamily: string,
  fontWeight: number,
  /** Fraction of the container's width the text should span. */
  widthFraction = 0.94,
  /** Fraction of the container's height the text may not exceed. */
  maxHeightFraction = 0.82,
  /** Must match the CSS `letter-spacing` (in em) applied to the text —
      `measureText` doesn't know about CSS letter-spacing, so a mismatch
      here reproduces the old overflow/clipping bug at a smaller scale:
      the real render comes out wider than what was measured. */
  letterSpacingEm = 0,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  /* In `em` of the element's own font-size, so it scales automatically
     with `fontSize` above without a second unit conversion. */
  const [centerOffsetEm, setCenterOffsetEm] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const measure = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      ctx.font = `${fontWeight} ${MEASURE_FONT_SIZE}px ${fontFamily}`;
      const metrics = ctx.measureText(text);

      setFontSize(solveFontSize(metrics, width, height, widthFraction, maxHeightFraction, letterSpacingEm, text.length));
      setCenterOffsetEm(solveCenterOffsetEm(metrics));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [
    text,
    fontFamily,
    fontWeight,
    widthFraction,
    maxHeightFraction,
    letterSpacingEm,
  ]);

  return { containerRef, fontSize, centerOffsetEm };
}

/** `.width` is the type-setting *advance* — it includes whatever blank
 * side bearing the font design bakes in before/after the first and last
 * glyph. Fitting to that leaves a gap between the actual ink (the
 * visible "Z"/"T" strokes) and the container edge even once the advance
 * box itself touches the edge. `actualBoundingBox*` instead reports the
 * real pixel extent of the rendered glyphs, so fitting to that is what
 * makes the visible letters themselves — not their invisible type box —
 * touch both edges. Falls back to `.width` on the rare browser without
 * bounding-box support (still correct, just leaves whatever bearing gap
 * that font happens to have). */
function inkWidthOf(metrics: TextMetrics): number {
  const hasInkBounds = typeof metrics.actualBoundingBoxLeft === 'number';
  if (!hasInkBounds) return metrics.width || 1;
  return metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight || 1;
}

function solveFontSize(
  metrics: TextMetrics,
  containerWidth: number,
  containerHeight: number,
  widthFraction: number,
  maxHeightFraction: number,
  letterSpacingEm: number,
  charCount: number,
): number {
  // CSS applies letter-spacing between every pair of characters, not
  // after the last one — add those gaps at the same reference size so
  // they scale down together with the glyphs.
  const gapCount = Math.max(0, charCount - 1);
  const totalWidth = inkWidthOf(metrics) + gapCount * letterSpacingEm * MEASURE_FONT_SIZE;

  const sizeForWidth = (containerWidth * widthFraction * MEASURE_FONT_SIZE) / totalWidth;
  const sizeForHeight = containerHeight * maxHeightFraction;
  return Math.max(1, Math.min(sizeForWidth, sizeForHeight));
}

/** `justify-content: center` on the wrapper centres the text's *advance
 * box* (spanning `[0, metrics.width]`), not its ink. Real fonts give
 * different left/right side bearing per glyph, so if e.g. "Z" and "T"
 * don't match, the ink can end up visibly off-centre — one letter with
 * room to spare, the other crowding its edge — even though the box
 * itself is dead-centre. This solves for how far off-centre the ink's
 * own midpoint sits, in `em` so it can be applied as a CSS
 * `translateX` alongside the solved font-size. */
function solveCenterOffsetEm(metrics: TextMetrics): number {
  const hasInkBounds = typeof metrics.actualBoundingBoxLeft === 'number';
  if (!hasInkBounds || metrics.width <= 0) return 0;

  const inkMidpoint = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2;
  const boxMidpoint = metrics.width / 2;
  return (boxMidpoint - inkMidpoint) / MEASURE_FONT_SIZE;
}
