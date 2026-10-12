'use client'

import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { inputClass } from '@/components/ui-classes'
import { addDays, daysBetween } from '@/lib/dates'
import { descriviRicorrenza } from '@/lib/ricorrenza'

const Label = ({ children }: { children: React.ReactNode }) => <span className="block text-sm font-medium">{children}</span>

// Data della partita, finestra delle convocazioni e (per una nuova partita) ripetizione.
// Finché l'organizzatore non tocca la finestra, questa segue la data scelta:
// apre 3 giorni prima alle 9:00 e chiude il giorno stesso alle 12:00.
export function QuandoFields({
  data: dataIniziale,
  apertura: aperturaIniziale,
  chiusura: chiusuraIniziale,
  nuova,
}: {
  data?: string
  apertura?: string
  chiusura?: string
  nuova: boolean
}) {
  const [data, setData] = useState(dataIniziale ?? '')
  const [apertura, setApertura] = useState(aperturaIniziale ?? '')
  const [chiusura, setChiusura] = useState(chiusuraIniziale ?? '')
  const [toccata, setToccata] = useState(!nuova)
  const [versione, setVersione] = useState(0)
  const [ripeti, setRipeti] = useState(false)
  const [ogni, setOgni] = useState(1)

  function cambiaData(v: string) {
    setData(v)
    if (toccata || !v) return
    const giorno = v.slice(0, 10)
    setApertura(`${addDays(giorno, -3)}T09:00`)
    setChiusura(`${giorno}T12:00`)
    setVersione((n) => n + 1) // ricrea i due calendari con i nuovi valori
  }

  const completa = data && apertura && chiusura
  const errore = !completa
    ? null
    : chiusura <= apertura
      ? 'La chiusura deve venire dopo l’apertura.'
      : chiusura > data
        ? 'Le convocazioni devono chiudersi prima della partita.'
        : null

  const riepilogo =
    completa && !errore
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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Data e ora della partita</Label>
        <DatePicker name="data" withTime required defaultValue={dataIniziale} onChange={cambiaData} />
      </div>

      <div className="space-y-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
        <div>
          <Label>Finestra convocazioni</Label>
          <p className="text-xs text-zinc-500">I giocatori possono dire &quot;ci sono&quot; solo in questo intervallo.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500">Apertura</span>
            <DatePicker
              key={`a${versione}`}
              name="aperturaConvocazioni"
              withTime
              required
              defaultValue={apertura || undefined}
              onChange={(v) => {
                setApertura(v)
                setToccata(true)
              }}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-zinc-500">Chiusura</span>
            <DatePicker
              key={`c${versione}`}
              name="chiusuraConvocazioni"
              withTime
              required
              defaultValue={chiusura || undefined}
              onChange={(v) => {
                setChiusura(v)
                setToccata(true)
              }}
            />
          </div>
        </div>
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
