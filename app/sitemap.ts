import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://fiscaliq.fr';
  const lastModified = new Date();

  const routes = [
    '',
    '/onboarding',
    '/payroll',
    '/tax-optimization',
    '/ai-assistant',
    '/declaration',
    '/echeances',
    '/pricing',
    '/about',
    '/privacy',
    '/terms',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' || route === '/onboarding' ? 1.0 : 0.8,
  }));
}
