import { cn } from '@/lib/utils';

/** A square vermilion seal ("hanko"-style stamp) for badges like "Signature" or a passport stamp. */
export function Hanko({ label, className, pressed = true, size = 'md' }: {
  label: string; className?: string; pressed?: boolean; size?: 'sm' | 'md' | 'lg';
}) {
  const s = { sm: 'h-10 w-10 text-[9px]', md: 'h-14 w-14 text-[10px]', lg: 'h-20 w-20 text-xs' }[size];
  return (
    <span
      className={cn(
        'stamp-press inline-flex shrink-0 items-center justify-center rounded-md border-2 border-vermilion p-1 text-center font-semibold uppercase leading-tight tracking-wider text-vermilion',
        pressed ? 'pressed' : 'opacity-30 grayscale',
        s, className,
      )}
    >
      <span className="rounded-sm border border-vermilion/60 px-0.5 py-0.5">{label}</span>
    </span>
  );
}
