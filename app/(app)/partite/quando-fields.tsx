'use client'

import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { inputClass } from '@/components/ui-classes'
import { addMinuti, daysBetween } from '@/lib/dates'
import { descriviRicorrenza } from '@/lib/ricorrenza'

const Label = ({ children }: { children: React.ReactNode }) => <span className="block text-sm font-medium">{children}</span>

export const DURATE_FINESTRA = [
  [60, '1 ora'],
  [120, '2 ore'],
  [180, '3 ore'],
  [360, '6 ore'],
  [720, '12 ore'],
  [1440, '1 giorno'],
  [2880, '2 giorni'],
] as const

const etichettaDurata = (min: number) =>
  DURATE_FINESTRA.find(([m]) => m === min)?.[1] ?? (min % 60 === 0 ? `${min / 60} ore` : `${min} minuti`)

// Data della partita, finestra delle convocazioni (inizio + durata, di default 2 ore)
// e, per una nuova partita, la ripetizione. La chiusura si calcola da sola e non va
// mai oltre l'inizio della partita.
export function QuandoFields({
  data: dataIniziale,
  apertura: aperturaIniziale,
  durata: durataIniziale = 120,
  nuova,
}: {
  data?: string
  apertura?: string
  /** Durata della finestra in minuti. */
  durata?: number
  nuova: boolean
}) {
  const [data, setData] = useState(dataIniziale ?? '')
  const [apertura, setApertura] = useState(aperturaIniziale ?? '')
  const [durata, setDurata] = useState(durataIniziale)
  const [ripeti, setRipeti] = useState(false)
  const [ogni, setOgni] = useState(1)

  const fineFinestra = apertura ? addMinuti(apertura, durata) : ''
  // La finestra non può andare oltre il calcio d'inizio.
  const chiusura = fineFinestra && data && fineFinestra > data ? data : fineFinestra
  const tagliata = !!(fineFinestra && data && fineFinestra > data)
  const errore = apertura && data && apertura >= data ? 'Le convocazioni devono aprirsi prima della partita.' : null

  const riepilogo =
    data && apertura && chiusura && !errore
      ? descriviRicorrenza({
          primaData: data.slice(0, 10),
          ora: data.slice(11, 16),
          ogniSettimane: ogni,
          aperturaGiorniPrima: daysBetween(apertura.slice(0, 10), data.slice(0, 10)),
          aperturaOra: apertura.slice(11, 16),
          chiusuraGiorniPrima: daysBetween(chiusura.slice(0, 10), data.slice(0, 10)),
          chiusuraOra: chiusura.slice(11, 16),
        })
      : null

  const opzioni = DURATE_FINESTRA.some(([m]) => m === durata) ? DURATE_FINESTRA : [...DURATE_FINESTRA, [durata, etichettaDurata(durata)] as const]

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Data e ora della partita</Label>
        <DatePicker name="data" withTime required defaultValue={dataIniziale} onChange={setData} placeholder="Scegli giorno e ora" />
      </div>

      <div className="space-y-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
        <div>
          <Label>Finestra convocazioni</Label>
          <p className="text-xs text-zinc-500">Da quando i giocatori possono dire &quot;ci sono&quot;, e per quanto tempo.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500">Inizio</span>
            <DatePicker name="aperturaConvocazioni" withTime required defaultValue={aperturaIniziale} onChange={setApertura} />
          </div>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Durata</span>
            <select value={durata} onChange={(e) => setDurata(Number(e.target.value))} className={inputClass}>
              {opzioni.map(([m, label]) => (
                <option key={m} value={m}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input type="hidden" name="chiusuraConvocazioni" value={chiusura} />
        <input type="hidden" name="durataFinestraMinuti" value={durata} />
        {chiusura && !errore && (
          <p className="text-xs text-zinc-500">
            Chiudono {chiusura.slice(0, 10) === apertura.slice(0, 10) ? 'alle' : `il ${chiusura.slice(8, 10)}/${chiusura.slice(5, 7)} alle`}{' '}
            {chiusura.slice(11, 16)}
            {tagliata && ' (all’inizio della partita)'} · l&apos;organizzatore può allungarla dalla partita.
          </p>
        )}
        {errore && <p className="text-sm text-red-600">{errore}</p>}
      </div>

      {nuova && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              name="ripeti"
              checked={ripeti}
              onChange={(e) => setRipeti(e.target.checked)}
              className="h-4 w-4 accent-green-600"
            />
            🔁 Ripeti partita e convocazioni
          </label>
          {ripeti && (
            <div className="space-y-3 rounded-lg border border-green-200 p-3 dark:border-green-900">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Ogni</span>
                  <select name="ogniSettimane" value={ogni} onChange={(e) => setOgni(Number(e.target.value))} className={inputClass}>
                    <option value={1}>settimana</option>
                    <option value={2}>2 settimane</option>
                  </select>
                </label>
                <div className="space-y-1 text-sm">
                  <span className="font-medium">Fino al (facoltativo)</span>
                  <DatePicker name="fineData" placeholder="Nessuna fine" min={data.slice(0, 10) || undefined} />
                </div>
              </div>
              {riepilogo ? (
                <p className="text-sm">
                  <b className="capitalize">{riepilogo.quando}</b>
                  <br />
                  {riepilogo.finestra}.
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Scegli data e finestra per vedere come si ripeterà.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
