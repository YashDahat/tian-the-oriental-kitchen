import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Search, ShoppingBag } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import RecommendationWidget from '@/components/recommendations/RecommendationWidget';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { DishCard } from '@/components/tian/DishCard';
import { KitchenArt } from '@/components/tian/KitchenArt';
import { Hanko } from '@/components/tian/Hanko';
import { SpiceMeter, VegMark } from '@/components/tian/VegMark';
import { useAddDish } from '@/components/tian/useAddDish';
import { useFavourites, useMenu, useToggleFavourite } from '@/hooks/diningHooks';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/cart';
import { KITCHENS, formatINR, kitchenName, usePageMeta } from '@/lib/tian';
import type { DishDto, Kitchen } from '@/types/dining';

type Tab = Kitchen | 'ALL' | 'FAVOURITES';

/** The menu, by kitchen — filter veg, search, save favourites, add to a takeaway pre-order. */
export default function MenuPage() {
  usePageMeta('Menu — dim sum, sushi & wok | TIAN Pune', 'TIAN menu: dim sum from the steamer, uramaki and the sushi board, wok noodles and curries. Veg and non-veg marked. Pre-order takeaway on Law College Road.');
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: menu, isLoading, isError, refetch } = useMenu();
  const { data: favs } = useFavourites();
  const toggleFav = useToggleFavourite();
  const addDish = useAddDish();
  const { cartCount, totals } = useCart();
  const [vegOnly, setVegOnly] = useState(false);
  const [q, setQ] = useState('');

  const tab = (params.get('kitchen') as Tab) ?? 'ALL';
  const openSlug = params.get('dish');
  const favSet = useMemo(() => new Set(favs ?? []), [favs]);
  const open = menu?.find((d) => d.slug === openSlug) ?? null;

  const setTab = (t: string) => {
    const next = new URLSearchParams(params);
    if (t === 'ALL') next.delete('kitchen'); else next.set('kitchen', t);
    setParams(next, { replace: true });
  };
  const openDish = (d: DishDto | null) => {
    const next = new URLSearchParams(params);
    if (d) next.set('dish', d.slug); else next.delete('dish');
    setParams(next, { replace: true });
  };
  const fav = (d: DishDto) => {
    if (!isAuthenticated) { navigate(`/login?redirect=${encodeURIComponent('/menu')}`); return; }
    toggleFav.mutate({ dishId: d.id, on: !favSet.has(d.id) });
  };

  const filtered = (menu ?? []).filter((d) =>
    (tab === 'ALL' || (tab === 'FAVOURITES' ? favSet.has(d.id) : d.kitchen === tab)) &&
    (!vegOnly || d.veg) &&
    (!q.trim() || `${d.name} ${d.description ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  const groups = KITCHENS.map((k) => ({ k, dishes: filtered.filter((d) => d.kitchen === k.id) })).filter((g) => g.dishes.length);
  const anyUnverified = (menu ?? []).some((d) => !d.priceVerified);

  return (
    <div className="washi pb-28">
      <div className="mx-auto max-w-6xl px-4 pt-12">
        <BrushHeading as="h1" size="xl" eyebrow="The menu" deva="पदार्थ">Steam, rice &amp; fire</BrushHeading>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Order ahead for pick-up at Law College Road, or browse before you come in. <VegMark veg /> vegetarian ·{' '}
          <VegMark veg={false} /> non-vegetarian.
        </p>

        <div className="sticky top-0 z-20 -mx-4 mt-8 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
              <TabsTrigger value="ALL" className="tap rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
              {KITCHENS.map((k) => (
                <TabsTrigger key={k.id} value={k.id} className="tap whitespace-nowrap rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{k.name}</TabsTrigger>
              ))}
              <TabsTrigger value="FAVOURITES" className="tap rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Heart className="mr-1 h-4 w-4" aria-hidden />Saved</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Label htmlFor="menu-search" className="sr-only">Search the menu</Label>
              <Input id="menu-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dumplings, noodles…" className="h-11 pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="veg-only" checked={vegOnly} onCheckedChange={setVegOnly} />
              <Label htmlFor="veg-only" className="flex items-center gap-2"><VegMark veg /> Veg only</Label>
            </div>
          </div>
        </div>

        {isError && (
          <div role="alert" className="mt-10 rounded-lg border p-6 text-center">
            <p>We couldn't load the menu just now.</p>
            <Button variant="outline" className="mt-3" onClick={() => refetch()}>Try again</Button>
          </div>
        )}
        {isLoading && <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}</div>}

        {!isLoading && !isError && groups.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            {tab === 'FAVOURITES'
              ? (isAuthenticated ? 'Tap the heart on any dish to save it here.' : 'Log in to save your favourite dishes.')
              : 'Nothing matches — try another search or turn off "Veg only".'}
          </div>
        )}

        {groups.map(({ k, dishes }) => (
          <section key={k.id} aria-labelledby={`k-${k.id}`} className="mt-12">
            <div className="flex items-end gap-4 border-b pb-3">
              <span className="text-sm font-semibold text-vermilion">{k.num}</span>
              <h2 id={`k-${k.id}`} className="brush text-3xl sm:text-4xl">{k.name}</h2>
              <span lang="mr" className="font-deva text-sm text-muted-foreground">{k.devanagari}</span>
              <p className="ml-auto hidden text-sm text-muted-foreground sm:block">{k.line}</p>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {dishes.map((d) => (
                <DishCard key={d.id} dish={d} favourite={favSet.has(d.id)} onToggleFavourite={() => fav(d)}
                  onAdd={() => addDish(d)} onOpen={() => openDish(d)} />
              ))}
            </div>
          </section>
        ))}

        {anyUnverified && !isLoading && (
          <p className="mt-12 text-xs text-muted-foreground">Some prices are indicative and may differ slightly at the restaurant. Taxes as applicable.</p>
        )}
      </div>

      {/* Sticky order bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm"><strong>{cartCount}</strong> {cartCount === 1 ? 'dish' : 'dishes'} · {formatINR(totals.total)}</p>
            <Button asChild className="tap rounded-full px-6"><Link to="/cart"><ShoppingBag className="mr-2 h-4 w-4" />Review pick-up order</Link></Button>
          </div>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && openDish(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <p className="eyebrow">{kitchenName(open.kitchen)}</p>
                <SheetTitle className="flex items-start gap-2 text-2xl"><span className="mt-1.5"><VegMark veg={open.veg} /></span>{open.name}</SheetTitle>
                <SheetDescription>{open.description}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 overflow-hidden rounded-lg border">
                {open.imageUrl ? <img src={open.imageUrl} alt={open.name} className="aspect-[4/3] w-full object-cover" />
                  : <div className="fretwork flex aspect-[4/3] items-center justify-center"><KitchenArt kitchen={open.kitchen} className="h-28 w-36" /></div>}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xl font-semibold">{formatINR(open.price)}</span>
                {open.pieces && <span className="text-sm text-muted-foreground">{open.pieces} pieces</span>}
                <SpiceMeter level={open.spiceLevel} />
                {open.signature && <Hanko label="Sig." size="sm" className="ml-auto" />}
              </div>
              <div className="mt-4 flex gap-2">
                {open.takeaway ? <Button className="tap flex-1 rounded-full" onClick={() => addDish(open)}>Add to pick-up order</Button>
                  : <p className="text-sm text-muted-foreground">Served at the restaurant only — book a table to try it.</p>}
                <Button variant="outline" className="tap rounded-full" onClick={() => fav(open)} aria-pressed={favSet.has(open.id)}>
                  <Heart className={favSet.has(open.id) ? 'h-4 w-4 fill-vermilion text-vermilion' : 'h-4 w-4'} /><span className="sr-only">Save</span>
                </Button>
              </div>
              <div className="mt-8">
                <RecommendationWidget itemType="DISH" itemId={open.id} type="CROSS_SELL" title="Goes well with" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
