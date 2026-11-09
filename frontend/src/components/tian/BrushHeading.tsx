import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

/** Numbered chapter heading: eyebrow + brush-calligraphy title + an ink stroke that draws in once. */
export function BrushHeading({ num, eyebrow, children, deva, className, as: Tag = 'h2', size = 'lg' }: {
  num?: string; eyebrow?: string; children: ReactNode; deva?: string; className?: string;
  as?: 'h1' | 'h2' | 'h3'; size?: 'xl' | 'lg' | 'md';
}) {
  const sizes = { xl: 'text-5xl sm:text-6xl md:text-7xl', lg: 'text-4xl sm:text-5xl', md: 'text-3xl sm:text-4xl' };
  return (
    <Reveal className={cn('space-y-2', className)}>
      {(num || eyebrow) && (
        <p className="eyebrow flex items-center gap-3">
          {num && <span className="font-semibold text-vermilion">{num}</span>}
          {num && <span aria-hidden className="h-px w-8 bg-border" />}
          {eyebrow}
          {deva && <span lang="mr" className="font-deva normal-case tracking-normal text-sm">{deva}</span>}
        </p>
      )}
      <Tag className={cn('brush text-foreground', sizes[size])}>{children}</Tag>
      <svg aria-hidden viewBox="0 0 220 12" className="brush-stroke h-3 w-40 text-gold" preserveAspectRatio="none">
        <path d="M2 8 C 40 2, 90 11, 140 5 S 200 4, 218 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </Reveal>
  );
}
