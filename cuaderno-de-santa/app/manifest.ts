import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'El Cuaderno de Santa',
    short_name: 'Santa',
    description: 'El cuaderno donde Santa anota las buenas obras hasta Nochebuena.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a1030',
    theme_color: '#0a1030',
    lang: 'es-CO',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
