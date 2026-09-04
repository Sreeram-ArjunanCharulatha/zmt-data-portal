import { useEffect, useRef, useState } from 'react';

// Sizes the "ZMT" watermark to span its container.
//
// Don't guess a vw font-size — the resolved font varies per machine
// (Avenir Next, Century Gothic, Inter) and a guess overflows and clips.
// measureText gives us the real metrics, so we solve for the size.

const MEASURE_FONT_SIZE = 200;

export function useFitWordmark(
  text: string,
  fontFamily: string,
  fontWeight: number,
  /** Fraction of the container's width the text should span. */
  widthFraction = 0.94,
  /** Fraction of the container's height the text may not exceed. */
  maxHeightFraction = 0.82,
  /** Must match the CSS letter-spacing. measureText doesn't know about
      it, so a mismatch means we measure narrower than we render. */
  letterSpacingEm = 0,
  /** Horizontal nudge as a fraction of container width (negative =
      left). Clamped to available slack so it can't clip. */
  shiftFraction = 0,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  /* In `em` of the element's own font-size, so it scales automatically
     with `fontSize` above without a second unit conversion. */
  const [centerOffsetEm, setCenterOffsetEm] = useState(0);
  // Per-character offsets that even out the optical gaps.
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

/** Width of the visible ink, not the advance box — the advance includes
 *  side bearing, which leaves a gap at the container edge. */
function inkWidthOf(metrics: TextMetrics): number {
  const hasInkBounds = typeof metrics.actualBoundingBoxLeft === 'number';
  if (!hasInkBounds) return metrics.width || 1;
  return metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight || 1;
}

/** Height of the rendered glyphs. A font-size is not a height — cap
 *  height is ~0.7em, the line box ~1.3em. */
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
  // Gaps go between characters, so n-1 of them.
  const gapCount = Math.max(0, charCount - 1);
  const totalWidth = inkWidthOf(metrics) + gapCount * letterSpacingEm * MEASURE_FONT_SIZE;

  const sizeForWidth = (containerWidth * widthFraction * MEASURE_FONT_SIZE) / totalWidth;
  // Against ink height, not font-size. Capping font-size at 0.82 of the
  // container rendered at ~1.06 of it, which is what was clipping.
  const sizeForHeight =
    (containerHeight * maxHeightFraction * MEASURE_FONT_SIZE) / inkHeightOf(metrics);
  return Math.max(1, Math.min(sizeForWidth, sizeForHeight));
}

/** shiftFraction as an em offset, clamped to the slack actually left
 *  once the mark is laid out. Measure it rather than trusting
 *  widthFraction — the height arm may have won. */
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

/** Evens out the optical gaps between glyphs.
 *
 *  letter-spacing is uniform but what you see is the gap between the
 *  ink, and that varies per pair — "ZM" reads much wider than "MT".
 *  Corrections sum to zero, so the outer letters don't move and the
 *  overall width is unchanged. Measured, since it's font-specific. */
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

  // Pen position per glyph, via the prefix width so kerning is included
  // rather than assumed away by summing advances.
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

/** Centring the wrapper centres the advance box, not the ink. Side
 *  bearings differ per glyph, so solve for how far off the ink sits. */
function solveCenterOffsetEm(
  metrics: TextMetrics,
  letterSpacingEm: number,
): number {
  const hasInkBounds = typeof metrics.actualBoundingBoxLeft === 'number';
  if (!hasInkBounds || metrics.width <= 0) return 0;

  const inkMidpoint = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2;
  const boxMidpoint = metrics.width / 2;
  const bearingCorrection = (boxMidpoint - inkMidpoint) / MEASURE_FONT_SIZE;

  // CSS puts a letter-space after the last character too, and centring
  // the box displaces the ink by half of it. Half the gap cancels it.
  return bearingCorrection + letterSpacingEm / 2;
}
