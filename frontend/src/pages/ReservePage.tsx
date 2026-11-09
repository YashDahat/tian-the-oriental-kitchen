import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Minus, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { useAvailability, useBookTable } from '@/hooks/diningHooks';
import { useAuth } from '@/context/AuthContext';
import { OCCASIONS, TIAN, formatDate, formatTime, isoDateIST, usePageMeta } from '@/lib/tian';
import type { Occasion, SlotAvailability } from '@/types/dining';
import { cn } from '@/lib/utils';

const DAYS = 14;

/**
 * Book a table in four short steps. Selections live in the URL so a guest who has to log in first comes
 * back to exactly where they were (RequireAuth-style redirect), with nothing to re-enter.
 */
export default function ReservePage() {
  usePageMeta('Book a table | TIAN — The Oriental Kitchen, Pune', 'Reserve a table at TIAN on Law College Road, Pune. Instant confirmation and live table status.');
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const book = useBookTable();

  const guests = Math.min(20, Math.max(1, Number(params.get('guests') ?? 2)));
  const date = params.get('date') ?? isoDateIST(0);
  const time = params.get('time');
  const seatingId = params.get('seating') ? Number(params.get('seating')) : null;
  const occasion = (params.get('occasion') as Occasion) ?? 'NONE';
  const [dietary, setDietary] = useState(params.get('dietary') ?? '');
  const [request, setRequest] = useState(params.get('request') ?? '');

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v == null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  const { data: avail, isLoading, isError, refetch } = useAvailability(date, guests);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => isoDateIST(i)), []);
  const lunch = avail?.slots.filter((s) => s.service === 'LUNCH') ?? [];
  const dinner = avail?.slots.filter((s) => s.service === 'DINNER') ?? [];
  const chosenSlot = avail?.slots.find((s) => s.time.slice(0, 5) === time);
  const chosenOption = chosenSlot?.options.find((o) => o.seatingOptionId === seatingId);
  const step = !time || !chosenOption ? 1 : 2;

  const errors: string[] = [];
  if (dietary.length > 500) errors.push('Dietary notes are limited to 500 characters.');
  if (request.length > 500) errors.push('Requests are limited to 500 characters.');
  const canBook = !!chosenOption && errors.length === 0 && !book.isPending;

  const submit = async () => {
    if (!chosenOption || !time) return;
    if (!isAuthenticated) {
      const next = new URLSearchParams(params);
      if (dietary) next.set('dietary', dietary);
      if (request) next.set('request', request);
      navigate(`/login?redirect=${encodeURIComponent(`/reserve?${next.toString()}`)}`);
      return;
    }
    const r = await book.mutateAsync({
      date, time: `${time}:00`, guests, seatingOptionId: chosenOption.seatingOptionId, occasion,
      dietaryNotes: dietary.trim() || null, specialRequest: request.trim() || null,
    });
    navigate(`/my-table?booked=${r.id}`);
  };

  const SlotGroup = ({ title, slots }: { title: string; slots: SlotAvailability[] }) => (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => {
          const hhmm = s.time.slice(0, 5);
          const active = time === hhmm;
          return (
            <button key={s.time} type="button" disabled={!s.available}
              onClick={() => set({ time: hhmm, seating: String(s.options[0]?.seatingOptionId ?? '') })}
              aria-pressed={active}
              className={cn('tap rounded-full border px-4 text-sm transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary',
                !s.available && 'cursor-not-allowed opacity-40 line-through')}>
              {formatTime(s.time)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div className="washi">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-12">
        <div className="min-w-0 md:col-span-7">
          <BrushHeading as="h1" size="xl" eyebrow="Reserve" deva="टेबल राखून ठेवा">Book a table</BrushHeading>
          <p className="mt-4 text-muted-foreground">Instant confirmation by email. Groups over 12? Call <a className="underline" href={TIAN.phoneHref}>{TIAN.phone}</a>.</p>
          <Progress value={step === 1 ? 45 : 90} className="mt-6 h-1" aria-label="Booking progress" />

          {/* Party + date */}
          <section className="mt-8 space-y-6" aria-labelledby="party-h">
            <h2 id="party-h" className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" aria-hidden />Party &amp; date</h2>
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" size="icon" className="tap rounded-full" aria-label="Fewer guests"
                disabled={guests <= 1} onClick={() => set({ guests: String(guests - 1), time: null, seating: null })}><Minus className="h-4 w-4" /></Button>
              <p className="min-w-[6rem] text-center text-lg" aria-live="polite"><strong>{guests}</strong> {guests === 1 ? 'guest' : 'guests'}</p>
              <Button type="button" variant="outline" size="icon" className="tap rounded-full" aria-label="More guests"
                disabled={guests >= 20} onClick={() => set({ guests: String(guests + 1), time: null, seating: null })}><Plus className="h-4 w-4" /></Button>
            </div>
            <div role="radiogroup" aria-label="Date" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
              {days.map((d, i) => {
                const active = d === date;
                return (
                  <button key={d} type="button" role="radio" aria-checked={active}
                    onClick={() => set({ date: d, time: null, seating: null })}
                    className={cn('tap flex w-16 shrink-0 flex-col items-center rounded-lg border px-2 py-2 text-sm',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary')}>
                    <span className="text-xs">{i === 0 ? 'Today' : formatDate(d, { weekday: 'short' })}</span>
                    <span className="text-lg font-semibold">{formatDate(d, { day: 'numeric' })}</span>
                    <span className="text-xs">{formatDate(d, { month: 'short' })}</span>
                  </button>
                );
              })}
              <label className="tap flex w-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border bg-card px-2 text-xs">
                <CalendarDays className="h-4 w-4" aria-hidden />Later date
                <input type="date" className="mt-1 w-full bg-transparent text-xs" min={isoDateIST(0)} max={isoDateIST(45)} value={date}
                  onChange={(e) => e.target.value && set({ date: e.target.value, time: null, seating: null })} aria-label="Pick a later date" />
              </label>
            </div>
          </section>

          {/* Slots */}
          <section className="mt-10 space-y-6" aria-labelledby="time-h">
            <h2 id="time-h" className="text-lg font-semibold">Time on {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            {isLoading && <Skeleton className="h-24 w-full" />}
            {isError && <div role="alert" className="rounded-lg border p-4">Couldn't load times. <Button variant="link" onClick={() => refetch()}>Retry</Button></div>}
            {avail && (
              avail.slots.some((s) => s.available) ? (
                <>
                  {lunch.length > 0 && <SlotGroup title="Lunch" slots={lunch} />}
                  {dinner.length > 0 && <SlotGroup title="Dinner" slots={dinner} />}
                </>
              ) : (
                <p className="rounded-lg border bg-card p-4 text-muted-foreground">We're fully booked for {guests} on this day. Try another date — or call us, we'll do our best.</p>
              )
            )}
            {chosenSlot && chosenSlot.options.length > 1 && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Table</legend>
                <div className="flex flex-wrap gap-2">
                  {chosenSlot.options.map((o) => (
                    <button key={o.seatingOptionId} type="button" aria-pressed={seatingId === o.seatingOptionId}
                      onClick={() => set({ seating: String(o.seatingOptionId) })}
                      className={cn('tap rounded-lg border px-4 text-sm', seatingId === o.seatingOptionId ? 'border-primary bg-accent' : 'bg-card')}>
                      {o.seatingName}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </section>

          {/* Occasion */}
          <section className="mt-10 space-y-4" aria-labelledby="occ-h">
            <h2 id="occ-h" className="text-lg font-semibold">Anything we should know?</h2>
            {errors.length > 0 && <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">{errors.join(' ')}</div>}
            <div role="radiogroup" aria-label="Occasion" className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={occasion === o.id}
                  onClick={() => set({ occasion: o.id === 'NONE' ? null : o.id })}
                  className={cn('tap rounded-full border px-4 text-sm', occasion === o.id ? 'border-vermilion bg-vermilion text-white dark:text-ink' : 'bg-card hover:border-vermilion')}>
                  {o.label}
                </button>
              ))}
            </div>
            {occasion !== 'NONE' && <p className="text-sm text-muted-foreground">We'll let the team know it's a special evening. Bringing a cake? Mention it below.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dietary">Dietary needs</Label>
                <Textarea id="dietary" rows={3} value={dietary} onChange={(e) => setDietary(e.target.value)}
                  placeholder="Jain, no garlic, nut allergy…" className={cn(dietary.length > 500 && 'border-destructive focus-visible:ring-destructive')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="request">Requests</Label>
                <Textarea id="request" rows={3} value={request} onChange={(e) => setRequest(e.target.value)}
                  placeholder="High chair, quiet corner, bringing a cake…" className={cn(request.length > 500 && 'border-destructive focus-visible:ring-destructive')} />
              </div>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="md:col-span-5">
          <div className="sticky top-6 rounded-lg border bg-card p-6">
            <p className="eyebrow">Your table</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd>{formatDate(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Time</dt><dd>{time ? formatTime(time) : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Guests</dt><dd>{guests}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Table</dt><dd>{chosenOption?.seatingName ?? '—'}</dd></div>
              {occasion !== 'NONE' && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Occasion</dt><dd>{OCCASIONS.find((o) => o.id === occasion)?.label}</dd></div>}
            </dl>
            <div className="rule my-5" />
            <Button className="tap w-full rounded-full" size="lg" disabled={!canBook} onClick={submit}>
              {book.isPending ? 'Booking…' : isAuthenticated ? 'Confirm booking' : 'Log in to confirm'}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">No deposit, no fees. Cancel anytime before you arrive from <Link to="/my-table" className="underline">My table</Link>.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
