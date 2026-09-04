import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Fades an element up when it scrolls into view. GSAP is imported lazily
 * so it stays off the critical path — same approach as AnimatedCounter.
 * If it fails to load, or reduced motion is on, the element just shows.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = elementRef.current;
    if (!element || reducedMotion) return;

    // Hide immediately, not after gsap loads, or it flashes visible
    // then snaps hidden when the tween starts.
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
