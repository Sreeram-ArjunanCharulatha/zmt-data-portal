import { useEffect, useRef } from 'react';

/** GSAP is shared across every glow instance on the page — importing it
 * once and caching the promise means a second `<div className="glow">`
 * elsewhere doesn't re-trigger the network request, and nothing pays for
 * it until the pointer actually moves over a glow surface for the first
 * time (well after initial page load/paint). */
let gsapPromise: Promise<typeof import('gsap')> | null = null;
function loadGsap() {
  if (!gsapPromise) gsapPromise = import('gsap');
  return gsapPromise;
}

/**
 * Tracks the pointer position over an element as two CSS custom
 * properties (`--glow-x`, `--glow-y`, in px relative to the element),
 * driving a radial-gradient spotlight defined entirely in CSS (see the
 * `.glow` utility in global.css).
 *
 * The spotlight doesn't snap straight to the cursor — it eases toward
 * it with a little lag, which is what actually reads as "liquid" rather
 * than a dot mechanically glued to the pointer. That easing is done
 * with GSAP's `quickTo` (built for exactly this: repeatedly retargeting
 * a tween without the setup cost of starting a new one each call), but
 * it's a genuine progressive enhancement: `pointermove` always writes
 * the CSS variables directly first, so the glow tracks the cursor
 * immediately even before GSAP has loaded, and `prefers-reduced-motion`
 * skips the easing (and the import) entirely and just snaps — matching
 * every other animation in this app.
 */
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const applyPosition = (x: number, y: number) => {
      element.style.setProperty('--glow-x', `${x}px`);
      element.style.setProperty('--glow-y', `${y}px`);
    };

    if (reducedMotion) {
      const onPointerMove = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        applyPosition(event.clientX - rect.left, event.clientY - rect.top);
      };
      element.addEventListener('pointermove', onPointerMove);
      return () => element.removeEventListener('pointermove', onPointerMove);
    }

    let cancelled = false;
    // Position GSAP eases toward; starts wherever the pointer first
    // lands so the very first frame doesn't glide in from a stale 0,0.
    const eased = { x: 0, y: 0 };
    let quickX: ((value: number) => void) | null = null;
    let quickY: ((value: number) => void) | null = null;

    const onUpdate = () => applyPosition(eased.x, eased.y);

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (quickX && quickY) {
        quickX(x);
        quickY(y);
        return;
      }

      // Before GSAP is ready: track immediately (no lag yet) so the
      // effect works from the very first pointer event, and kick off
      // the one-time import that upgrades subsequent moves to eased.
      eased.x = x;
      eased.y = y;
      applyPosition(x, y);

      loadGsap().then(({ gsap }) => {
        if (cancelled) return;
        // A little viscosity, not a rubber band: fast enough that the
        // glow never feels like it's chasing the cursor from far away,
        // slow enough that it visibly trails rather than teleporting.
        quickX = gsap.quickTo(eased, 'x', {
          duration: 0.5,
          ease: 'power3',
          onUpdate,
        });
        quickY = gsap.quickTo(eased, 'y', {
          duration: 0.5,
          ease: 'power3',
          onUpdate,
        });
      });
    };

    element.addEventListener('pointermove', onPointerMove);
    return () => {
      cancelled = true;
      element.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return ref;
}
