import { Heart, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/tian';
import type { DishDto } from '@/types/dining';
import { Hanko } from './Hanko';
import { KitchenArt } from './KitchenArt';
import { SpiceMeter, VegMark } from './VegMark';

/** A menu card: image (or line art), veg mark, name, price, spice, signature seal, favourite + add. */
export function DishCard({ dish, favourite, onToggleFavourite, onAdd, onOpen, compact = false }: {
  dish: DishDto; favourite?: boolean; onToggleFavourite?: () => void; onAdd?: () => void; onOpen?: () => void; compact?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const add = () => {
    onAdd?.();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };
  return (
    <article className="lift group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <button type="button" onClick={onOpen} className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-left"
        aria-label={`More about ${dish.name}`}>
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt={dish.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="fretwork flex h-full w-full items-center justify-center"><KitchenArt kitchen={dish.kitchen} className="h-24 w-32" /></div>
        )}
        {dish.signature && <Hanko label="Sig." size="sm" className="absolute right-3 top-3 bg-card/90" />}
      </button>
      <div className={cn('flex flex-1 flex-col gap-2 p-4', compact && 'p-3')}>
        <div className="flex items-start gap-2">
          <span className="mt-1"><VegMark veg={dish.veg} /></span>
          <h3 className="flex-1 font-semibold leading-snug">{dish.name}</h3>
          {onToggleFavourite && (
            <button type="button" onClick={onToggleFavourite} aria-pressed={!!favourite}
              aria-label={favourite ? `Remove ${dish.name} from favourites` : `Save ${dish.name} to favourites`}
              className="tap -m-2 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-vermilion">
              <Heart className={cn('h-5 w-5', favourite && 'fill-vermilion text-vermilion')} />
            </button>
          )}
        </div>
        {!compact && dish.description && <p className="line-clamp-2 text-sm text-muted-foreground">{dish.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{formatINR(dish.price)}</span>
            {dish.pieces && <span className="text-xs text-muted-foreground">{dish.pieces} pcs</span>}
            <SpiceMeter level={dish.spiceLevel} />
          </div>
          {onAdd && dish.takeaway && (
            <Button size="sm" variant="outline" onClick={add} className="tap rounded-full" aria-label={`Add ${dish.name} to takeaway order`}>
              {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">{added ? 'Added' : 'Add'}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
