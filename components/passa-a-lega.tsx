'use client'

import { useEffect } from 'react'

// Una pagina di un'altra lega (partita, torneo) aperta dal calendario o da un link: la lega attiva passa
// da sola a quella, ricaricando la pagina con ?apri= (vedi proxy.ts), così testata, menu e tema sono giusti.
// Chi è in più leghe (la squadra del Club e la lega con gli amici) non si ritrova nella "casa" sbagliata.
export function PassaALega({ legaId, nome, testo }: { legaId: string; nome: string; testo: string }) {
  useEffect(() => {
    // una volta sola per pagina: se il cambio non riuscisse, niente ricariche a ripetizione
    const chiave = `passa-a-lega:${legaId}:${window.location.pathname}`
    try {
      const ultima = Number(sessionStorage.getItem(chiave))
      if (ultima && Date.now() - ultima < 60_000) return
      sessionStorage.setItem(chiave, String(Date.now()))
    } catch {}
    const url = new URL(window.location.href)
    url.searchParams.set('apri', legaId)
    window.location.replace(url.pathname + url.search + url.hash)
  }, [legaId])
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {testo} <b>{nome}</b> …
    </p>
  )
}
