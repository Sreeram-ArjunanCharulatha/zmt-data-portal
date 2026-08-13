import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type AnimatedCounterProps = {
  value: number;
  className?: string;
  formatter: Intl.NumberFormat;
};

/**
 * Counts up to `value` once it scrolls into view, instead of just
 * appearing. GSAP is imported dynamically (`import('gsap')`) only when a
 * counter is actually about to animate, not on initial page load — this
 * section sits below the fold, so nothing here should compete with the
 * globe/canvas bundle for the critical path. If the import is slow, is
 * blocked, or the visitor has `prefers-reduced-motion` on, the number
 * just renders at its final value immediately; nothing here is required
 * for the page to be correct.
 */
export function AnimatedCounter({ value, className, formatter }: AnimatedCounterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => formatter.format(value));

  useEffect(() => {
    const element = elementRef.current;
    if (!element || reducedMotion) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        import('gsap').then(({ gsap }) => {
          if (cancelled) return;
          const counter = { current: 0 };
          gsap.to(counter, {
            current: value,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: () => setDisplay(formatter.format(Math.round(counter.current))),
          });
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // `value`/`formatter` intentionally excluded: the count-up should
    // only ever run once, the first time this figure scrolls into view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <div ref={elementRef} className={className}>
      {display}
    </div>
  );
}
