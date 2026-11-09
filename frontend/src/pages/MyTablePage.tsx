import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, MessageCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { Hanko } from '@/components/tian/Hanko';
import { diningKeys, useMyReservations } from '@/hooks/diningHooks';
import { orderService } from '@/services/orderService';
import { withToast } from '@/lib/apiToast';
import { TIAN, bookingIcs, formatDate, formatTime, occasionLabel, usePageMeta, whatsappShare } from '@/lib/tian';
import type { ReservationDto } from '@/types/dining';
import { cn } from '@/lib/utils';

const STEPS = [
  { code: 'CONFIRMED', label: 'Confirmed' },
  { code: 'ARRIVED', label: 'Checked in' },
  { code: 'SEATED', label: 'Seated' },
  { code: 'COMPLETED', label: 'Thank you' },
];

/** Live status of a booking — the workflow stage the host moves on the order board. */
function StatusTrack({ stage }: { stage: string | null }) {
  if (stage === 'CANCELLED') return <p className="text-sm font-semibold text-vermilion">Cancelled</p>;
  const idx = Math.max(0, STEPS.findIndex((s) => s.code === stage));
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Booking status">
      {STEPS.map((s, i) => (
        <li key={s.code} className="space-y-2" aria-current={i === idx ? 'step' : undefined}>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className={cn('timeline-fill h-full bg-primary', i <= idx ? 'scale-x-100' : 'scale-x-0')} style={{ transformOrigin: 'left' }} />
          </div>
          <p className={cn('text-xs', i <= idx ? 'font-semibold' : 'text-muted-foreground')}>
            {i < idx && <Check className="mr-1 inline h-3 w-3" aria-hidden />}{s.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function BookingCard({ r, highlight }: { r: ReservationDto; highlight: boolean }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const share = whatsappShare(`I've booked a table at TIAN — The Oriental Kitchen for ${formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })} at ${formatTime(r.time)}. ${TIAN.directionsUrl}`);
  const cancel = async () => {
    await withToast(orderService.cancel(r.orderId, 'Cancelled by guest'), 'Booking cancelled');
    qc.invalidateQueries({ queryKey: diningKeys.reservations });
    setConfirm(false);
  };
  return (
    <article className={cn('rounded-lg border bg-card p-5', highlight && 'border-primary ring-1 ring-primary')}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="eyebrow">{r.seatingName}{r.orderNumber ? ` · ${r.orderNumber}` : ''}</p>
          <h2 className="mt-1 text-xl font-semibold">{formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(r.time)}</h2>
          <p className="text-sm text-muted-foreground">{r.guests} {r.guests === 1 ? 'guest' : 'guests'}{r.occasion !== 'NONE' ? ` · ${occasionLabel(r.occasion)}` : ''}</p>
        </div>
        {highlight && <Hanko label="Booked" className="pressed" />}
      </div>
      <div className="mt-5"><StatusTrack stage={r.stageCode} /></div>
      {r.upcoming && r.stageCode !== 'CANCELLED' && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="tap rounded-full"><a href={bookingIcs(r.date, r.time, r.guests)} download="tian-booking.ics"><CalendarPlus className="mr-1 h-4 w-4" />Add to calendar</a></Button>
          <Button asChild variant="outline" size="sm" className="tap rounded-full"><a href={share} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" />Share on WhatsApp</a></Button>
          <Button asChild variant="outline" size="sm" className="tap rounded-full"><a href={TIAN.directionsUrl} target="_blank" rel="noreferrer"><Navigation className="mr-1 h-4 w-4" />Directions</a></Button>
          {r.cancellable && <Button variant="ghost" size="sm" className="tap rounded-full text-destructive" onClick={() => setConfirm(true)}>Cancel booking</Button>}
        </div>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Cancel this booking?"
        description="Your table will be released for other guests." confirmLabel="Cancel booking" destructive onConfirm={cancel} />
    </article>
  );
}

export default function MyTablePage() {
  usePageMeta('My table | TIAN');
  const [params] = useSearchParams();
  const booked = Number(params.get('booked') ?? 0);
  const { data, isLoading, isError, refetch } = useMyReservations();
  const upcoming = (data ?? []).filter((r) => r.upcoming && r.stageCode !== 'CANCELLED').reverse();
  const past = (data ?? []).filter((r) => !r.upcoming || r.stageCode === 'CANCELLED');

  return (
    <div className="washi">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <BrushHeading as="h1" size="xl" eyebrow="My table">Your bookings</BrushHeading>
        <p className="mt-3 text-muted-foreground">Status updates live as our host checks you in and seats you.</p>
        <div className="mt-8 space-y-4" aria-live="polite">
          {isLoading && <Skeleton className="h-48 w-full rounded-lg" />}
          {isError && <div role="alert" className="rounded-lg border p-4">Couldn't load your bookings. <Button variant="link" onClick={() => refetch()}>Retry</Button></div>}
          {!isLoading && !isError && upcoming.length === 0 && (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p>No upcoming tables yet.</p>
              <Button asChild className="tap mt-4 rounded-full"><Link to="/reserve">Book a table</Link></Button>
            </div>
          )}
          {upcoming.map((r) => <BookingCard key={r.id} r={r} highlight={r.id === booked} />)}
        </div>
        {past.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold">Past &amp; cancelled</h2>
            <ul className="mt-4 divide-y rounded-lg border bg-card">
              {past.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <span>{formatDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime(r.time)} · {r.guests} guests</span>
                  <span className={r.stageCode === 'CANCELLED' ? 'text-vermilion' : 'text-muted-foreground'}>{r.stageLabel ?? r.stageCode}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
