import type { Kitchen } from '@/types/dining';
import { cn } from '@/lib/utils';

/**
 * Line illustrations (inline SVG, no image requests) standing in for dish photography until the restaurant
 * uploads real photos in the media library. Drawn in currentColor so they theme with light/dark.
 */
export function KitchenArt({ kitchen, className }: { kitchen: Kitchen; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 120 90" aria-hidden className={cn('text-foreground/70', className)}>
      {kitchen === 'STEAMER' && (
        <g {...common}>
          <ellipse cx="60" cy="62" rx="42" ry="10" />
          <path d="M18 62 V48 M102 62 V48" />
          <ellipse cx="60" cy="48" rx="42" ry="10" />
          <path d="M26 52 h68 M26 57 h68" opacity=".5" />
          <path d="M44 30 c0-6 6-6 6-12 M60 28 c0-6 6-6 6-12 M76 30 c0-6 6-6 6-12" opacity=".6" />
        </g>
      )}
      {kitchen === 'SUSHI' && (
        <g {...common}>
          <rect x="14" y="58" width="92" height="12" rx="2" />
          <circle cx="36" cy="46" r="11" /><circle cx="36" cy="46" r="5" />
          <circle cx="62" cy="46" r="11" /><circle cx="62" cy="46" r="5" />
          <path d="M80 50 c8-10 18-10 24 0 z" />
          <path d="M84 22 l22 26 M90 20 l20 24" />
        </g>
      )}
      {kitchen === 'WOK' && (
        <g {...common}>
          <path d="M12 44 h84 c0 16-18 26-42 26 s-42-10-42-26 z" />
          <path d="M96 46 h18" />
          <path d="M34 40 c6-14 14-14 20 0 M50 38 c6-16 16-16 22 0" opacity=".6" />
          <path d="M40 24 c-2-6 2-8 0-14 M60 22 c-2-6 2-8 0-14" opacity=".5" />
        </g>
      )}
      {kitchen === 'SMALL_PLATES' && (
        <g {...common}>
          <ellipse cx="60" cy="58" rx="44" ry="12" />
          <path d="M34 50 c4-8 12-8 16 0 M52 48 c4-10 14-10 18 0 M72 50 c4-8 12-8 16 0" />
          <path d="M96 20 l-30 30 M102 26 l-30 30" opacity=".6" />
        </g>
      )}
      {kitchen === 'SWEETS' && (
        <g {...common}>
          <path d="M30 60 c0-18 60-18 60 0 z" />
          <path d="M30 60 h60" />
          <path d="M48 46 c4-4 8-4 12 0 c4-4 8-4 12 0" opacity=".6" />
          <path d="M56 30 c-2-6 2-8 0-12 M66 30 c-2-6 2-8 0-12" opacity=".5" />
        </g>
      )}
    </svg>
  );
}
