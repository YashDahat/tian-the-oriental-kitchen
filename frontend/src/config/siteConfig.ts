// TIAN — The Oriental Kitchen: branding + navigation for the foundation SiteHeader / SiteFooter.
// Colour classes are omitted so the shell follows the app-wide light (washi) / dark (sumi) theme tokens.
import type { SiteConfig } from '@/shell';

export const siteConfig: SiteConfig = {
  header: {
    brandName: 'TIAN',
    logoUrl: '/favicon.svg',
    navLinks: [
      { label: 'Menu', href: '/menu' },
      { label: 'Our Story', href: '/story' },
      { label: 'Passport', href: '/passport' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Visit', href: '/visit' },
      { label: 'My table', href: '/my-table' },
    ],
    ctaButton: { label: 'Book a table', href: '/reserve' },
    showAuth: true,
    showCart: true,
  },
  footer: {
    brandName: 'TIAN — The Oriental Kitchen',
    tagline: 'Dim sum, sushi and the wok on Law College Road.',
    address: 'Showroom No 1, Pradeep Chambers, Law College Rd, Shivajinagar, Pune 411004',
    phone: '+91 78229 10626',
    email: null,
    openingHours: 'Daily 11 am–3:30 pm · 6:30–11:30 pm',
    quickLinks: [
      { label: 'Menu & pick-up', href: '/menu' },
      { label: 'Book a table', href: '/reserve' },
      { label: 'Dumpling Passport', href: '/passport' },
      { label: 'Directions', href: '/visit' },
      { label: 'Loyalty terms', href: '/loyalty-terms' },
    ],
    socialLinks: [
      { platform: 'instagram', url: 'https://www.instagram.com/tiankitchenpune/' },
      { platform: 'whatsapp', url: 'https://wa.me/917822910626' },
    ],
  },
};

export default siteConfig;
