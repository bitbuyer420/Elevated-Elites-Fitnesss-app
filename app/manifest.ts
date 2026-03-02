import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elevated Elites',
    short_name: 'EE',
    description: 'Elite fitness tracking for those who demand excellence.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#CC0000',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
