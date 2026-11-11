'use client'

import { useEffect, useState } from 'react'
import { Salute, saluteDisponibile } from '@/lib/salute'
import { buttonClass, inputClass } from './ui-classes'

// Solo per il titolare dell'app, nel suo profilo: legge da Apple Salute / Health Connect i metri
// tra due orari a scelta, con lo stesso calcolo dei km delle partite. Non salva niente.
const oggiAlle = (ore: number) => {
  const d = new Date()
  d.setHours(ore, 0, 0, 0)
  // formato di <input type="datetime-local"> nell'ora locale
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function ProvaKm() {
  const [disponibile, setDisponibile] = useState(false)
  const [inizio, setInizio] = useState(oggiAlle(10))
  const [fine, setFine] = useState(oggiAlle(12))
  const [esito, setEsito] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nell'app
    setDisponibile(saluteDisponibile())
  }, [])

  if (!disponibile) return null

  const leggi = async () => {
    setPending(true)
    setEsito(null)
    try {
      const { metri } = await Salute.distanza({ inizio: new Date(inizio).getTime(), fine: new Date(fine).getTime() })
      setEsito(`${(metri / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} km (${Math.round(metri)} m)`)
    } catch (e) {
      setEsito(`Errore: ${(e as { message?: string })?.message ?? e}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3 px-4 py-3 text-sm">
      <p className="font-semibold">🧪 Prova km da Salute (solo titolare)</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-zinc-500">
          Dalle
          <input type="datetime-local" value={inizio} onChange={(e) => setInizio(e.target.value)} className={inputClass} />
        </label>
        <label className="space-y-1 text-xs text-zinc-500">
          Alle
          <input type="datetime-local" value={fine} onChange={(e) => setFine(e.target.value)} className={inputClass} />
        </label>
      </div>
      <button type="button" disabled={pending} onClick={leggi} className={`${buttonClass('primary')} w-full`}>
        {pending ? 'Leggo…' : 'Leggi i km'}
      </button>
      {esito && <p className="text-center text-lg font-bold">{esito}</p>}
    </div>
  )
}
