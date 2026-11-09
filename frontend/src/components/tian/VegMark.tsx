/** Indian FSSAI-style veg / non-veg marker with an accessible label. */
export function VegMark({ veg }: { veg: boolean }) {
  const color = veg ? '#1E7A34' : '#9A2A1A';
  return (
    <span className="inline-flex items-center" role="img" aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'} title={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <rect x="1" y="1" width="14" height="14" fill="#fff" stroke={color} strokeWidth="1.6" rx="2" />
        {veg ? <circle cx="8" cy="8" r="3.6" fill={color} /> : <path d="M8 3.8 L12.4 11.6 H3.6 Z" fill={color} />}
      </svg>
    </span>
  );
}

export function SpiceMeter({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <span className="text-xs text-vermilion" aria-label={`Spice level ${level} of 3`} title={`Spice ${level}/3`}>
      {'●'.repeat(level)}<span className="text-muted-foreground">{'○'.repeat(3 - level)}</span>
    </span>
  );
}
