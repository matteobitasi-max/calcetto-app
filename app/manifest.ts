import type { MetadataRoute } from 'next'

// Permette di aggiungere l'app alla schermata Home (su iPhone è necessario per le notifiche).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TheCap',
    short_name: 'TheCap',
    description: 'Convocazioni per le partite di calcetto',
    start_url: '/',
    display: 'standalone',
    background_color: '#008538',
    theme_color: '#008538',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
