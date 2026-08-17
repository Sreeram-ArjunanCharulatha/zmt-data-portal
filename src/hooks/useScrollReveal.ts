import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Fades + rises an element in once it scrolls into view, mirroring the
 * dynamic-`import('gsap')` + IntersectionObserver pattern already used by
 * AnimatedCounter — the element sits below the fold, so nothing here
 * should compete with the globe/canvas bundle for the critical path. If
 * the import is slow, is blocked, or `prefers-reduced-motion` is on, the
 * element just stays visible at its resting position; nothing here is
 * required for the page to be correct.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = elementRef.current;
    if (!element || reducedMotion) return;

    // Plain CSS, set immediately — not gated on the gsap import — so the
    // element is hidden from its very first paint. Without this, it would
    // render at full opacity for a frame (or longer, on a slow import),
    // then visibly snap to hidden right before the reveal tween starts.
    element.style.opacity = '0';
    element.style.transform = 'translateY(56px)';

    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        import('gsap').then(({ gsap }) => {
          if (cancelled) return;
          gsap.to(element, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
          });
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      element.style.opacity = '';
      element.style.transform = '';
    };
  }, [reducedMotion]);

  return elementRef;
}
