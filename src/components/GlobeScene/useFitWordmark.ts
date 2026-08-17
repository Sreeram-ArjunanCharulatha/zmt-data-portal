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
  /** Nudges the mark horizontally, as a fraction of the container's
      width (negative = left). Clamped to whatever slack `widthFraction`
      actually leaves, so a shift can never push the mark under
      `.wordmark`'s `overflow: hidden` and clip a letter — ask for more
      room by lowering `widthFraction`, not by over-shifting. */
  shiftFraction = 0,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  /* In `em` of the element's own font-size, so it scales automatically
     with `fontSize` above without a second unit conversion. */
  const [centerOffsetEm, setCenterOffsetEm] = useState(0);
  /* One `em` offset per character, evening out the optical gaps between
     them — see `solveLetterOffsetsEm`. */
  const [letterOffsetsEm, setLetterOffsetsEm] = useState<number[]>([]);

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

      const size = solveFontSize(metrics, width, height, widthFraction, maxHeightFraction, letterSpacingEm, text.length);
      setFontSize(size);
      setCenterOffsetEm(
        solveCenterOffsetEm(metrics, letterSpacingEm) +
          solveShiftEm(metrics, width, size, letterSpacingEm, text.length, shiftFraction),
      );
      setLetterOffsetsEm(solveLetterOffsetsEm(ctx, text, letterSpacingEm));
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
    shiftFraction,
  ]);

  return { containerRef, fontSize, centerOffsetEm, letterOffsetsEm };
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

/** Height of the rendered glyphs at `MEASURE_FONT_SIZE`, for the same
 * reason `inkWidthOf` exists: a font-size is not a height. Cap height
 * for a bold geometric sans runs ~0.7em and the full line box ~1.3em,
 * so the two differ by nearly a factor of two. Falls back to a typical
 * cap-height ratio where bounding-box metrics aren't supported. */
const FALLBACK_CAP_HEIGHT_RATIO = 0.72;

function inkHeightOf(metrics: TextMetrics): number {
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  if (typeof ascent !== 'number' || typeof descent !== 'number') {
    return MEASURE_FONT_SIZE * FALLBACK_CAP_HEIGHT_RATIO;
  }
  return ascent + descent || MEASURE_FONT_SIZE * FALLBACK_CAP_HEIGHT_RATIO;
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
  /* Solve against the glyphs' real ink height, exactly as the width arm
     solves against their real ink width. The old form was
     `containerHeight * maxHeightFraction`, which conflated font-size
     with rendered height: at maxHeightFraction 0.82 it picked a
     font-size of 0.82 * container, whose line box then rendered at
     ~1.06 * container — so the cap that exists to prevent clipping was
     itself the thing overflowing the wrapper and getting clipped. */
  const sizeForHeight =
    (containerHeight * maxHeightFraction * MEASURE_FONT_SIZE) / inkHeightOf(metrics);
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
/** Converts `shiftFraction` into an `em` offset, clamped to the real
 * slack left over once the mark is laid out at `fontSize`. Measuring the
 * slack rather than trusting `widthFraction` matters because the height
 * arm of `solveFontSize` can win, in which case the mark is narrower
 * than `widthFraction` asked for and there is *more* room to move than
 * expected — and conversely a `widthFraction` of 1 leaves none at all. */
function solveShiftEm(
  metrics: TextMetrics,
  containerWidth: number,
  fontSize: number,
  letterSpacingEm: number,
  charCount: number,
  shiftFraction: number,
): number {
  if (!shiftFraction || fontSize <= 0) return 0;

  const gapCount = Math.max(0, charCount - 1);
  const inkAtReference =
    inkWidthOf(metrics) + gapCount * letterSpacingEm * MEASURE_FONT_SIZE;
  const inkWidth = (inkAtReference * fontSize) / MEASURE_FONT_SIZE;

  const slack = Math.max(0, (containerWidth - inkWidth) / 2);
  const wanted = shiftFraction * containerWidth;
  const clamped = Math.max(-slack, Math.min(slack, wanted));
  return clamped / fontSize;
}

/** Per-character `em` offsets that even out the *optical* gaps between
 * glyphs.
 *
 * `letter-spacing` is uniform, but the whitespace the eye actually sees
 * between two letters is the gap between their **ink**, and that varies
 * per pair with the glyphs' own side bearings: against this mark's font
 * "ZM" renders a markedly wider gap than "MT" at the same spacing, which
 * reads as the "M" sitting too close to the "T".
 *
 * Each gap is measured, the mean is taken as the target, and every
 * character is nudged by the running correction needed to hit it. The
 * corrections sum to zero at the final character, so the first and last
 * glyphs never move — the mark's total ink width, and therefore the
 * fitting and centring solved elsewhere in this file, are unaffected.
 *
 * Measured rather than hardcoded because the numbers are font-specific,
 * and the resolved font differs per machine (Avenir Next, Century
 * Gothic, Inter) — the same reason the size itself is measured.
 */
function solveLetterOffsetsEm(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacingEm: number,
): number[] {
  const chars = [...text];
  if (chars.length < 3) return chars.map(() => 0);

  const first = ctx.measureText(chars[0]);
  if (typeof first.actualBoundingBoxLeft !== 'number') {
    return chars.map(() => 0);
  }

  const spacing = letterSpacingEm * MEASURE_FONT_SIZE;

  /* Pen position of each glyph. Derived from the width of the prefix
     *ending* at that glyph minus the glyph's own advance, so any kerning
     the font applies within the run is included rather than assumed
     away by summing advances. */
  const origins = chars.map((char, i) => {
    if (i === 0) return 0;
    const prefix = ctx.measureText(text.slice(0, i + 1)).width;
    return prefix - ctx.measureText(char).width + spacing * i;
  });

  const gaps: number[] = [];
  for (let i = 0; i < chars.length - 1; i += 1) {
    const leftInkEnd =
      origins[i] + ctx.measureText(chars[i]).actualBoundingBoxRight;
    const rightInkStart =
      origins[i + 1] - ctx.measureText(chars[i + 1]).actualBoundingBoxLeft;
    gaps.push(rightInkStart - leftInkEnd);
  }

  const target = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  const offsets = [0];
  for (let i = 0; i < gaps.length; i += 1) {
    offsets.push(offsets[i] + (target - gaps[i]));
  }
  return offsets.map((offset) => offset / MEASURE_FONT_SIZE);
}

function solveCenterOffsetEm(
  metrics: TextMetrics,
  letterSpacingEm: number,
): number {
  const hasInkBounds = typeof metrics.actualBoundingBoxLeft === 'number';
  if (!hasInkBounds || metrics.width <= 0) return 0;

  const inkMidpoint = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2;
  const boxMidpoint = metrics.width / 2;
  const bearingCorrection = (boxMidpoint - inkMidpoint) / MEASURE_FONT_SIZE;

  /* CSS applies `letter-spacing` after *every* character, the last one
     included, so the advance box carries a trailing gap that has no
     glyph after it. `justify-content: center` centres that box, which
     displaces the visible ink by half the trailing gap — with the
     negative spacing this mark uses, that pushed the letters right by
     ~35px, leaving a visibly wider margin before the "Z" than after the
     "T". Half the gap cancels it exactly.
     (`solveFontSize` is right to use `charCount - 1` gaps: it measures
     the ink run, not the advance box. The two differ by precisely this
     one trailing gap.) */
  return bearingCorrection + letterSpacingEm / 2;
}
