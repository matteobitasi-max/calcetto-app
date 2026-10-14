'use client'

import { App } from '@capacitor/app'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { partiteSenzaKm, salvaKm } from '@/app/actions'
import { Salute, kmAutomatici, partiteEscluse, saluteDisponibile } from '@/lib/salute'

// App per iPhone, con i km automatici attivi: all'apertura e quando l'app torna in primo piano
// prende da Apple Salute / Health Connect i km delle mie partite finite (ultimi 7 giorni) a cui mancano.
// Apple permette di leggere Salute solo con l'app aperta: non si può fare a telefono in tasca.
export function KmAutomatici() {
  const router = useRouter()

  useEffect(() => {
    if (!saluteDisponibile()) return
    let inCorso = false
    const sincronizza = async () => {
      if (inCorso || !kmAutomatici()) return
      inCorso = true
      try {
        const escluse = new Set(partiteEscluse())
        let salvati = 0
        for (const p of await partiteSenzaKm()) {
          if (escluse.has(p.matchId)) continue
          const { metri } = await Salute.distanza({ inizio: p.inizio, fine: p.fine })
          if (metri >= 50 && !(await salvaKm(p.matchId, metri / 1000, 'salute')).error) salvati++
        }
        if (salvati) router.refresh()
      } catch {
        // niente rete o niente Salute: si riprova alla prossima apertura
      } finally {
        inCorso = false
      }
    }
    sincronizza()
    const listener = App.addListener('appStateChange', ({ isActive }) => isActive && sincronizza())
    return () => {
      listener.then((l) => l.remove())
    }
  }, [router])

  return null
}
