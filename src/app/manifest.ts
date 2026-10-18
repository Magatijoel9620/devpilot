
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DevPilot — Your work, under control',
    short_name: 'DevPilot',
    description: 'Personal developer command centre',
    start_url: '/',
    display: 'standalone',
    background_color: '#101713',
    theme_color: '#47856b',
    orientation: 'any',
    icons: [
      {
        src: '/HG.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/HG.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
