import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default () =>
  ({
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }) as MetadataRoute.Robots;
