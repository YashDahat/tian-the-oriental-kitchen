import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { Reveal } from '@/components/tian/Reveal';
import { useStory } from '@/hooks/diningHooks';
import { usePageMeta } from '@/lib/tian';

/** Our Story: admin-editable chapters on a timeline whose ink line fills as you read (no scroll-jacking). */
export default function StoryPage() {
  usePageMeta('Our story | TIAN — The Oriental Kitchen, Pune', 'The street, the steamer, the sushi table and the wok — the story of TIAN on Law College Road, Pune.');
  const { data: chapters, isLoading, isError, refetch } = useStory();
  const lineRef = useRef<HTMLDivElement | null>(null);
  const [fill, setFill] = useState(1);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const onScroll = () => {
      const el = lineRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const progress = (window.innerHeight * 0.6 - r.top) / Math.max(1, r.height);
      setFill(Math.min(1, Math.max(0, progress)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [chapters?.length]);

  return (
    <div className="washi">
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
        <BrushHeading as="h1" size="xl" eyebrow="Our story" deva="आमची गोष्ट">Steam, rice &amp; a red-lit room</BrushHeading>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          A restaurant is a sum of small, repeated crafts. Here is ours — told chapter by chapter.
        </p>

        {isLoading && <div className="mt-12 space-y-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>}
        {isError && <div role="alert" className="mt-12 rounded-lg border p-4">Couldn't load the story. <Button variant="link" onClick={() => refetch()}>Retry</Button></div>}

        {chapters && (
          <div ref={lineRef} className="relative mt-16">
            <div aria-hidden className="absolute left-4 top-0 h-full w-px bg-border md:left-1/2" />
            <div aria-hidden className="timeline-fill absolute left-4 top-0 h-full w-px bg-vermilion md:left-1/2"
              style={{ transform: `scaleY(${fill})` }} />
            <ol className="space-y-16">
              {chapters.map((c, i) => (
                <li key={c.id} className="relative grid gap-4 pl-12 md:grid-cols-2 md:gap-12 md:pl-0">
                  <span aria-hidden className="absolute left-[9px] top-2 h-3 w-3 rounded-full border-2 border-vermilion bg-background md:left-[calc(50%-6px)]" />
                  <Reveal className={i % 2 === 0 ? 'md:text-right md:pr-10' : 'md:col-start-2 md:pl-10'}>
                    <p className="eyebrow"><span className="text-vermilion">{String(i + 1).padStart(2, '0')}</span> · {c.label}</p>
                    <h2 className="brush mt-2 text-3xl sm:text-4xl">{c.title}</h2>
                    <p className="mt-3 text-muted-foreground">{c.body}</p>
                    {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="mt-4 rounded-lg border" />}
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        )}

        <Reveal className="mt-20 rounded-lg border bg-card p-8 text-center">
          <p className="brush text-4xl">Come and taste the next chapter</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="tap rounded-full"><Link to="/reserve">Book a table</Link></Button>
            <Button asChild variant="outline" className="tap rounded-full"><Link to="/menu">See the menu</Link></Button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
