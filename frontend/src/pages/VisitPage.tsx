import { Link } from 'react-router-dom';
import { Clock, MapPin, MessageCircle, Navigation, Phone, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { Reveal } from '@/components/tian/Reveal';
import { TIAN, openNow, usePageMeta, whatsappChat } from '@/lib/tian';

/** Contact & location: hours, map, call, directions, WhatsApp. */
export default function VisitPage() {
  usePageMeta('Visit TIAN | Law College Road, Shivajinagar, Pune', 'Find TIAN — The Oriental Kitchen at Pradeep Chambers, Law College Road, Shivajinagar, Pune 411004. Open daily for lunch and dinner.');
  const status = openNow();
  return (
    <div className="washi">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <BrushHeading as="h1" size="xl" eyebrow="Visit" deva="भेट द्या">Find us on Law College Road</BrushHeading>
        <div className="mt-10 grid gap-10 md:grid-cols-12">
          <Reveal className="space-y-8 md:col-span-5">
            <div className="flex gap-3"><MapPin className="mt-1 h-5 w-5 shrink-0 text-vermilion" aria-hidden />
              <div><p className="font-semibold">Address</p><p className="text-muted-foreground">{TIAN.address}</p></div></div>
            <div className="flex gap-3"><Clock className="mt-1 h-5 w-5 shrink-0 text-vermilion" aria-hidden />
              <div>
                <p className="font-semibold">Hours <span className={status.open ? 'text-green-700 dark:text-green-400' : 'text-vermilion'}>· {status.label}</span></p>
                <ul className="text-muted-foreground">{TIAN.hours.map((h) => <li key={h.label}>{h.label}: {h.time} (daily)</li>)}</ul>
              </div></div>
            <div className="flex gap-3"><Phone className="mt-1 h-5 w-5 shrink-0 text-vermilion" aria-hidden />
              <div><p className="font-semibold">Phone</p><a href={TIAN.phoneHref} className="text-muted-foreground underline-offset-4 hover:underline">{TIAN.phone}</a></div></div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="tap rounded-full"><a href={TIAN.directionsUrl} target="_blank" rel="noreferrer"><Navigation className="mr-2 h-4 w-4" />Directions</a></Button>
              <Button asChild variant="outline" className="tap rounded-full"><a href={TIAN.phoneHref}><Phone className="mr-2 h-4 w-4" />Call</a></Button>
              <Button asChild variant="outline" className="tap rounded-full"><a href={whatsappChat('Hi TIAN! I have a question about a table.')} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>
              <Button asChild variant="outline" className="tap rounded-full"><a href={TIAN.instagram} target="_blank" rel="noreferrer"><AtSign className="mr-2 h-4 w-4" />Instagram</a></Button>
            </div>
            <p className="text-sm text-muted-foreground">UPI, cards and cash accepted. Planning a group of 10–80? <Link className="underline" to="/reserve?guests=8">Start a group booking</Link> or call us.</p>
          </Reveal>
          <Reveal className="md:col-span-7" delay={100}>
            <div className="overflow-hidden rounded-lg border">
              <iframe title="Map showing TIAN on Law College Road" src={TIAN.embedUrl} loading="lazy"
                className="h-[360px] w-full md:h-[460px]" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
