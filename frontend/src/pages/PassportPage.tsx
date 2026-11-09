import { Link } from 'react-router-dom';
import { Gift, MessageCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { Hanko } from '@/components/tian/Hanko';
import { Reveal } from '@/components/tian/Reveal';
import { DishCard } from '@/components/tian/DishCard';
import { useAddDish } from '@/components/tian/useAddDish';
import { useAuth } from '@/context/AuthContext';
import { useMenu, useFavourites, usePassport, useToggleFavourite } from '@/hooks/diningHooks';
import { useMyOrders } from '@/hooks/orderHooks';
import { KITCHENS, formatDate, usePageMeta, whatsappShare } from '@/lib/tian';

/**
 * The Dumpling Passport: a stamp for every new dish tasted (collected pick-up orders) and every visit
 * (stamped when our host seats you). Plus one-tap reorder and saved favourites.
 */
export default function PassportPage() {
  usePageMeta('Dumpling Passport | TIAN', 'Collect a stamp for every TIAN dish you try and every visit. Rewards set by the restaurant.');
  const { isAuthenticated } = useAuth();
  const { data: passport, isLoading } = usePassport();
  const { data: menu } = useMenu();
  const { data: favs } = useFavourites();
  const { data: orders } = useMyOrders();
  const toggleFav = useToggleFavourite();
  const addDish = useAddDish();

  if (!isAuthenticated) {
    return (
      <div className="washi">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <BrushHeading as="h1" size="xl" eyebrow="Dumpling Passport" className="mx-auto">Taste your way through TIAN</BrushHeading>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">Every new dish you try and every visit earns a stamp. Fill your passport, unlock rewards
            the restaurant sets, and keep your favourites one tap away.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild className="tap rounded-full"><Link to="/signup">Start my passport</Link></Button>
            <Button asChild variant="outline" className="tap rounded-full"><Link to="/login?redirect=%2Fpassport">Log in</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const stamped = new Set((passport?.stamps ?? []).map((s) => s.dishId));
  const favDishes = (menu ?? []).filter((d) => (favs ?? []).includes(d.id));
  const lastPickup = (orders ?? []).find((o) => o.workflowCode === 'takeaway' && o.items.some((i) => i.itemType === 'DISH'));
  const next = passport?.nextMilestone;
  const prevStamps = next ? Math.max(0, ...(passport?.milestones ?? []).filter((m) => m.stamps < next.stamps).map((m) => m.stamps)) : 0;
  const pct = next && passport ? Math.round(((passport.total - prevStamps) / Math.max(1, next.stamps - prevStamps)) * 100) : 100;

  const reorder = () => {
    if (!lastPickup || !menu) return;
    lastPickup.items.filter((i) => i.itemType === 'DISH').forEach((i) => {
      const d = menu.find((m) => m.id === i.itemId);
      if (d) addDish(d, i.quantity);
    });
  };

  const invite = whatsappShare('I\'ve been collecting dumpling stamps at TIAN — The Oriental Kitchen on Law College Road. Come try the crystal dumplings with me! ' + window.location.origin + '/passport');

  return (
    <div className="washi">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <BrushHeading as="h1" size="xl" eyebrow="Dumpling Passport" deva="पासपोर्ट">Your passport</BrushHeading>
        {isLoading && <Skeleton className="mt-8 h-40 w-full" />}
        {passport && (
          <div className="mt-8 grid gap-8 md:grid-cols-12">
            <Reveal className="rounded-lg border bg-card p-6 md:col-span-5">
              <p className="eyebrow">Stamps</p>
              <p className="mt-2 text-5xl font-semibold">{passport.total}</p>
              <p className="text-sm text-muted-foreground">{passport.dishStamps} of {passport.totalDishes} dishes tasted · {passport.visits} {passport.visits === 1 ? 'visit' : 'visits'}</p>
              {next ? (
                <div className="mt-6 space-y-2">
                  <p className="text-sm"><strong>{next.stamps - passport.total}</strong> more to <strong>{next.title}</strong></p>
                  <Progress value={pct} className="h-2" aria-label={`Progress to ${next.title}`} />
                  {next.reward && <p className="flex gap-2 text-sm text-muted-foreground"><Gift className="h-4 w-4 shrink-0" aria-hidden />{next.reward}</p>}
                </div>
              ) : <p className="mt-6 text-sm">Every milestone unlocked — thank you for being a regular.</p>}
              <ul className="mt-6 space-y-2 text-sm">
                {passport.milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Hanko label={String(m.stamps)} size="sm" pressed={passport.total >= m.stamps} />
                    <span className={passport.total >= m.stamps ? 'font-semibold' : 'text-muted-foreground'}>{m.title}{passport.total >= m.stamps ? ' — unlocked, mention it at your table' : ''}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="tap rounded-full"><a href={invite} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" />Invite a friend</a></Button>
              </div>
            </Reveal>

            <div className="md:col-span-7">
              {KITCHENS.map((k) => {
                const dishes = (menu ?? []).filter((d) => d.kitchen === k.id);
                if (!dishes.length) return null;
                return (
                  <section key={k.id} className="mb-6">
                    <h2 className="mb-3 text-sm font-semibold">{k.name}</h2>
                    <ul className="flex flex-wrap gap-3">
                      {dishes.map((d) => (
                        <li key={d.id} className="flex w-24 flex-col items-center gap-1 text-center">
                          <Hanko label={d.name.split(' ')[0].slice(0, 7)} pressed={stamped.has(d.id)} />
                          <span className="text-[11px] leading-tight text-muted-foreground">{d.name}</span>
                          <span className="sr-only">{stamped.has(d.id) ? 'tasted' : 'not yet tasted'}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              <p className="text-xs text-muted-foreground">Dishes are stamped when a pick-up order is collected; visits when our host seats you.</p>
            </div>
          </div>
        )}

        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="brush text-3xl">Your usuals</h2>
            {lastPickup && (
              <Button onClick={reorder} className="tap rounded-full"><RotateCcw className="mr-2 h-4 w-4" />Reorder last pick-up ({formatDate(lastPickup.createdAt.slice(0, 10), { day: 'numeric', month: 'short' })})</Button>
            )}
          </div>
          {favDishes.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Tap the heart on any dish in the <Link className="underline" to="/menu">menu</Link> to keep it here.</p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favDishes.map((d) => <DishCard key={d.id} dish={d} favourite onToggleFavourite={() => toggleFav.mutate({ dishId: d.id, on: false })} onAdd={() => addDish(d)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
