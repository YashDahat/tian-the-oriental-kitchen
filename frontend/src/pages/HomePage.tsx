import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Phone, ShoppingBag, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { Reveal } from '@/components/tian/Reveal';
import { Hanko } from '@/components/tian/Hanko';
import { KitchenArt } from '@/components/tian/KitchenArt';
import { DishCard } from '@/components/tian/DishCard';
import { useAddDish } from '@/components/tian/useAddDish';
import { useMenu, useStory } from '@/hooks/diningHooks';
import { KITCHENS, TIAN, openNow, usePageMeta } from '@/lib/tian';

/** Home: who we are → what we make → why people return → book / visit. */
export default function HomePage() {
  usePageMeta('TIAN — The Oriental Kitchen | Dim sum, sushi & wok · Law College Road, Pune',
    'Dim sum from the steamer, sushi and wok-tossed noodles on Law College Road, Pune. 4.8★ from 1,500+ Google reviews. Book a table online.');
  const { data: menu, isLoading } = useMenu();
  const { data: story } = useStory();
  const addDish = useAddDish();
  const status = openNow();
  const signatures = (menu ?? []).filter((d) => d.signature).slice(0, 6);
  const why = story?.find((c) => c.label === 'Why people return');
  const intro = story?.[0];

  return (
    <div className="washi">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b">
        <div aria-hidden className="fretwork absolute inset-y-0 right-0 hidden w-1/3 opacity-70 md:block" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <p className="eyebrow mb-5 flex flex-wrap items-center gap-3">
              <span>Law College Road · Shivajinagar · Pune</span>
              <span lang="mr" className="font-deva text-sm normal-case tracking-normal">लॉ कॉलेज रोड</span>
            </p>
            <h1 className="brush text-6xl leading-[0.95] sm:text-7xl md:text-8xl">TIAN</h1>
            <p className="mt-3 text-lg font-medium tracking-wide text-muted-foreground">The Oriental Kitchen</p>
            <p className="mt-6 max-w-xl text-lg">
              Dim sum from the steamer, sushi from the table, noodles from a roaring wok — served in a room of
              red fretwork shadows, a few steps off Law College Road.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="tap rounded-full px-7"><Link to="/reserve"><CalendarDays className="mr-2 h-4 w-4" />Book a table</Link></Button>
              <Button asChild size="lg" variant="outline" className="tap rounded-full px-7"><Link to="/menu"><ShoppingBag className="mr-2 h-4 w-4" />Order takeaway</Link></Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
                <dt className="sr-only">Rating</dt><dd><strong>{TIAN.rating}</strong> from {TIAN.reviewCount.toLocaleString('en-IN')}+ Google reviews</dd></div>
              <div className="flex items-center gap-2"><span aria-hidden className={`h-2 w-2 rounded-full ${status.open ? 'bg-green-600' : 'bg-vermilion'}`} />
                <dt className="sr-only">Hours</dt><dd>{status.label}</dd></div>
            </dl>
          </div>
          <Reveal className="relative md:col-span-5">
            <div className="relative ml-auto aspect-[4/5] max-w-sm rounded-lg border bg-card p-6 shadow-sm">
              <div className="fretwork absolute inset-3 rounded-md" aria-hidden />
              <div className="relative flex h-full flex-col justify-between">
                <Hanko label="4.8 ★" size="lg" className="self-end bg-card" />
                <KitchenArt kitchen="STEAMER" className="mx-auto h-40 w-52 text-foreground" />
                <p className="brush text-3xl">Folded. Steamed. Shared.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 01 Who we are ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5"><BrushHeading num="01" eyebrow="Who we are">{intro?.title ?? 'A doorway on Law College Road'}</BrushHeading></div>
          <Reveal className="md:col-span-6 md:col-start-7 space-y-5 text-lg">
            <p>{intro?.body ?? 'TIAN sits in Pradeep Chambers on Law College Road, Shivajinagar.'}</p>
            <Link to="/story" className="tap inline-flex items-center font-semibold text-primary underline-offset-4 hover:underline">Read our story →</Link>
          </Reveal>
        </div>
      </section>

      {/* ── 02 What we make: the kitchens ── */}
      <section className="border-y bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <BrushHeading num="02" eyebrow="What we make">Three kitchens, one table</BrushHeading>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {KITCHENS.slice(0, 3).map((k, i) => (
              <div key={k.id} className={i === 1 ? 'md:translate-y-8' : ''}><Reveal delay={i * 90}>
                <Link to={`/menu?kitchen=${k.id}`} className="lift block rounded-lg border bg-background p-6">
                  <span className="text-sm font-semibold text-vermilion">{k.num}</span>
                  <KitchenArt kitchen={k.id} className="my-4 h-24 w-32" />
                  <h3 className="brush text-3xl">{k.name}</h3>
                  <p lang="mr" className="font-deva text-sm text-muted-foreground">{k.devanagari}</p>
                  <p className="mt-2 text-muted-foreground">{k.line}</p>
                </Link>
              </Reveal></div>
            ))}
          </div>

          <div className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="text-xl font-semibold">Dishes guests keep coming back for</h3>
              <Link to="/menu" className="tap inline-flex items-center font-semibold text-primary hover:underline">Full menu →</Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
              {signatures.map((d) => <DishCard key={d.id} dish={d} onAdd={() => addDish(d)} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 Why people return ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrushHeading num="03" eyebrow="Why people return">{why?.title ?? 'A 4.8 that guests keep earning'}</BrushHeading>
          </div>
          <div className="md:col-span-7 space-y-6">
            <Reveal><p className="text-lg">{why?.body}</p></Reveal>
            <ul className="grid gap-4 sm:grid-cols-3">
              {[['Presentation', 'Plates that arrive as an occasion — the sushi board above all.'],
                ['Hospitality', 'Warm, attentive service that guests mention by name.'],
                ['Vegetarian-friendly', 'Dumplings, uramaki and curries made for vegetarians.']].map(([t, d], i) => (
                <Reveal as="li" key={t} delay={i * 80} className="rounded-lg border bg-card p-4">
                  <p className="font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </Reveal>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">Themes summarised from public Google reviews.</p>
          </div>
        </div>
      </section>

      {/* ── 04 Come in / take it home ── */}
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
          <Reveal>
            <p className="eyebrow !text-paper/70"><span className="text-gold">04</span> · Visit</p>
            <h2 className="brush mt-2 text-5xl text-paper">Save yourself a seat</h2>
            <p className="mt-4 max-w-md text-paper/80">Book in under a minute, tell us if it's a birthday or an anniversary, and follow
              your table's status live — from confirmed to seated.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="tap rounded-full bg-gold text-ink hover:bg-gold/90"><Link to="/reserve">Book a table</Link></Button>
              <Button asChild size="lg" variant="outline" className="tap rounded-full border-paper/40 bg-transparent text-paper hover:bg-paper/10 hover:text-paper"><Link to="/passport">Dumpling Passport</Link></Button>
            </div>
          </Reveal>
          <Reveal className="space-y-4 text-paper/90" delay={100}>
            <p className="flex gap-3"><MapPin className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden />{TIAN.address}</p>
            <p className="flex gap-3"><Phone className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden /><a className="underline-offset-4 hover:underline" href={TIAN.phoneHref}>{TIAN.phone}</a></p>
            <ul className="space-y-1">{TIAN.hours.map((h) => <li key={h.label}><span className="inline-block w-20 text-paper/70">{h.label}</span>{h.time}</li>)}</ul>
            <a href={TIAN.directionsUrl} target="_blank" rel="noreferrer" className="tap inline-flex items-center font-semibold text-gold hover:underline">Get directions →</a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
