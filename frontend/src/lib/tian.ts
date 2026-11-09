import { useEffect } from 'react';
import type { Kitchen, Occasion } from '@/types/dining';

/** Real, public facts about TIAN (Google Business listing) — used across pages + JSON-LD. */
export const TIAN = {
  name: 'TIAN — The Oriental Kitchen',
  short: 'TIAN',
  phone: '+91 78229 10626',
  phoneHref: 'tel:+917822910626',
  whatsappNumber: '917822910626',
  address: 'Showroom No 1, Pradeep Chambers, Law College Rd, Shivajinagar, Pune 411004',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=TIAN%20The%20Oriental%20Kitchen&query_place_id=ChIJbXi1c6q_wjsRDJcvZDkx9iQ',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=18.5191543,73.8305353&destination_place_id=ChIJbXi1c6q_wjsRDJcvZDkx9iQ',
  embedUrl: 'https://www.google.com/maps?q=18.5191543,73.8305353&z=17&output=embed',
  instagram: 'https://www.instagram.com/tiankitchenpune/',
  rating: 4.8,
  reviewCount: 1530,
  hours: [
    { label: 'Lunch', time: '11:00 am – 3:30 pm' },
    { label: 'Dinner', time: '6:30 pm – 11:30 pm' },
  ],
  hoursLine: 'Open daily · 11 am–3:30 pm · 6:30–11:30 pm',
} as const;

/** "Is the kitchen open right now?" in Pune time. */
export function openNow(now = new Date()): { open: boolean; label: string } {
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const m = ist.getHours() * 60 + ist.getMinutes();
  if (m >= 660 && m < 930) return { open: true, label: 'Open now · lunch until 3:30 pm' };
  if (m >= 1110 && m < 1410) return { open: true, label: 'Open now · dinner until 11:30 pm' };
  if (m < 660) return { open: false, label: 'Opens at 11 am' };
  if (m < 1110) return { open: false, label: 'Dinner from 6:30 pm' };
  return { open: false, label: 'Opens tomorrow at 11 am' };
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
/** ₹ with Indian grouping (₹1,25,000). */
export const formatINR = (n: number) => inr.format(n);

export const KITCHENS: { id: Kitchen; name: string; devanagari: string; line: string; num: string }[] = [
  { id: 'STEAMER', name: 'The Steamer', devanagari: 'वाफ', line: 'Dim sum, folded and steamed to order', num: '01' },
  { id: 'SUSHI', name: 'The Sushi Table', devanagari: 'सुशी', line: 'Uramaki and the board guests photograph', num: '02' },
  { id: 'WOK', name: 'The Wok', devanagari: 'कढई', line: 'Noodles, rice and curries over high flame', num: '03' },
  { id: 'SMALL_PLATES', name: 'Small Plates', devanagari: 'छोटे पदार्थ', line: 'Edamame, crisp starters and soup', num: '04' },
  { id: 'SWEETS', name: 'Sweets', devanagari: 'गोड', line: 'Something warm to finish', num: '05' },
];
export const kitchenName = (k: Kitchen) => KITCHENS.find((x) => x.id === k)?.name ?? k;

export const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: 'NONE', label: 'Just dinner' },
  { id: 'BIRTHDAY', label: 'Birthday' },
  { id: 'ANNIVERSARY', label: 'Anniversary' },
  { id: 'DATE_NIGHT', label: 'Date night' },
  { id: 'FAMILY', label: 'Family meal' },
  { id: 'BUSINESS', label: 'Business' },
  { id: 'CELEBRATION', label: 'Other celebration' },
];
export const occasionLabel = (o: Occasion) => OCCASIONS.find((x) => x.id === o)?.label ?? o;

export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const whatsappChat = (text: string) => `https://wa.me/${TIAN.whatsappNumber}?text=${encodeURIComponent(text)}`;

/** "19:30:00" → "7:30 pm". */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2026-11-14" → "Sat, 14 Nov". Parsed as a local calendar date (no timezone shift). */
export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  const [y, mo, da] = d.split('-').map(Number);
  return new Date(y, mo - 1, da).toLocaleDateString('en-IN', opts);
}

/** Local YYYY-MM-DD in Pune time. */
export function isoDateIST(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** A downloadable .ics so the guest can add the booking to their calendar. */
export function bookingIcs(date: string, time: string, guests: number): string {
  const [y, mo, d] = date.split('-');
  const [h, m] = time.split(':');
  const start = `${y}${mo}${d}T${h}${m}00`;
  const endH = String(Math.min(23, Number(h) + 2)).padStart(2, '0');
  const end = `${y}${mo}${d}T${endH}${m}00`;
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TIAN//Booking//EN', 'BEGIN:VEVENT',
    `UID:tian-${date}-${time}-${guests}@tian`, `DTSTART;TZID=Asia/Kolkata:${start}`, `DTEND;TZID=Asia/Kolkata:${end}`,
    `SUMMARY:Table at TIAN for ${guests}`, `LOCATION:${TIAN.address.replace(/,/g, '\\,')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
