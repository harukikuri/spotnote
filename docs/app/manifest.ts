import type { MetadataRoute } from 'next';

// Home-screen and install icons (public/icon-*.png).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spotnote',
    short_name: 'Spotnote',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
