'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Nelle pagine di modifica: all'apertura chiede subito i dati aggiornati al server. L'app, navigando
// al suo interno, può riusare una copia vecchia della pagina (es. i voti di prima del salvataggio);
// con i dati nuovi il modulo si ricrea (ha come `key` la revisione del documento).
export function AggiornaAllApertura() {
  const router = useRouter()
  useEffect(() => {
    router.refresh()
  }, [router])
  return null
}
