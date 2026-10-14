'use client'

import { useEffect, useState } from 'react'
import { Salute, impostaKmAutomatici, kmAutomatici, nomeSalute, saluteDisponibile } from '@/lib/salute'

// Nel mio account (solo nell'app): km delle partite presi da soli da Apple Salute / Health Connect.
export function SaluteAccount() {
  const [disponibile, setDisponibile] = useState(false)
  const [attivi, setAttivi] = useState(false)
  const [pending, setPending] = useState(false)
  const [nome, setNome] = useState('Apple Salute')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nell'app
    setDisponibile(saluteDisponibile())
    setAttivi(kmAutomatici())
    setNome(nomeSalute())
  }, [])

  if (!disponibile) return null

  const cambia = async () => {
    if (attivi) {
      impostaKmAutomatici(false)
      setAttivi(false)
      return
    }
    setPending(true)
    try {
      // chiede il permesso di Salute (solo la prima volta compare la richiesta di Apple)
      await Salute.distanza({ inizio: Date.now() - 3600_000, fine: Date.now() })
      impostaKmAutomatici(true)
      setAttivi(true)
    } catch {
      setAttivi(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>
        <span className="font-semibold">❤️ Km automatici da {nome}</span>
        <span className="block text-xs text-zinc-500">
          Dopo ogni partita, aprendo l&apos;app, i km che hai corso compaiono da soli accanto al tuo nome.
        </span>
      </span>
      <input type="checkbox" checked={attivi} disabled={pending} onChange={cambia} className="h-5 w-5 shrink-0 accent-green-600" />
    </label>
  )
}
