'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Reindirizzamento "morbido" da una pagina che si sta caricando: un cambio di pagina interno all'app.
// Il redirect() del server a pagina già in streaming fa ripartire il caricamento del documento, e
// nell'app per iPhone l'interruzione del primo caricamento mostra "Nessuna connessione".
export function VaiA({ href }: { href: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(href)
  }, [href, router])
  return null
}
