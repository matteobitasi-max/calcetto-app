'use client'

import { useEffect } from 'react'

// Leghe Club PRO: l'app diventa blu (classe "tema-club" su <html>, vedi app/globals.css). Lo ricorda anche
// nel telefono, così alla prossima apertura il blu c'è già prima che la pagina si disegni (lib/tema.ts).
export function TemaClub({ attivo }: { attivo: boolean }) {
  useEffect(() => {
    document.documentElement.classList.toggle('tema-club', attivo)
    try {
      if (attivo) localStorage.setItem('temaClub', '1')
      else localStorage.removeItem('temaClub')
    } catch {}
  }, [attivo])
  return null
}
