import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Settles a chapter into view once, the first time it enters the viewport. Content is rendered visible;
 * only elements still below the fold are put in a "pending" state after mount — so nothing is ever hidden
 * waiting for JS, and with reduced motion everything simply shows. transform/opacity only.
 */
export function Reveal({ as: Tag = 'div', className, children, delay = 0 }: {
  as?: ElementType; className?: string; children: ReactNode; delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced() || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      el.classList.add('reveal-in');
      return;
    }
    el.classList.add('reveal-pending');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          window.setTimeout(() => {
            el.classList.remove('reveal-pending');
            el.classList.add('reveal-in');
          }, delay);
          io.disconnect();
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className={cn(className)}>{children}</Tag>;
}
