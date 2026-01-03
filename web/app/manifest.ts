import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default () =>
  ({
    name: 'FMD Server',
    short_name: 'FMD Server',
    description: 'Locate and control your devices from a web interface.',
    start_url: '/',
    display: 'standalone',
    background_color: '#232323',
    theme_color: '#4cb050',
    icons: [
      {
        src: '/FMD.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }) as MetadataRoute.Manifest;
