'use client'

import { useState } from 'react'
import { creaTorneo } from '@/app/actions'
import { ActionForm } from '@/components/action-form'
import { DatePicker } from '@/components/date-picker'
import { PillSalva } from '@/components/pill-salva'
import { Card, Field, inputClass } from '@/components/ui'
import { SQUADRE_PREDEFINITE, giornate } from '@/lib/girone'

export type GiocatoreRosa = { id: string; nome: string; forza: number; ruolo?: string }

const FREQUENZE = [
  { giorni: 7, label: 'Una giornata a settimana' },
  { giorni: 14, label: 'Una giornata ogni 2 settimane' },
  { giorni: 1, label: 'Una giornata al giorno' },
  { giorni: 0, label: 'Tutto in un giorno (partite una dopo l’altra)' },
]

// Nuovo torneo a girone: squadre, giocatori (anche bilanciati in automatico) e calendario.
export function TorneoForm({ legaId, rosa, inizio }: { legaId: string; rosa: GiocatoreRosa[]; inizio?: string }) {
  const [numSquadre, setNumSquadre] = useState(4)
  const [nomi, setNomi] = useState(SQUADRE_PREDEFINITE.map((s) => s.nome))
  // giocatore → indice della squadra ('' = non partecipa)
  const [squadraDi, setSquadraDi] = useState<Record<string, string>>({})
  const [andataRitorno, setAndataRitorno] = useState(false)
  const [ogniGiorni, setOgniGiorni] = useState(7)

  const squadre = SQUADRE_PREDEFINITE.slice(0, numSquadre)
  const nelTorneo = rosa.filter((p) => squadraDi[p.id] !== undefined && squadraDi[p.id] !== '' && Number(squadraDi[p.id]) < numSquadre)
  const calendario = giornate(numSquadre, andataRitorno)

  // Bilancia: i giocatori scelti (o tutta la rosa, se non ne hai scelto nessuno) distribuiti "a serpentina" per forza.
  const bilancia = () => {
    const scelti = nelTorneo.length ? nelTorneo : rosa
    const ordinati = [...scelti].sort((a, b) => b.forza - a.forza)
    const nuovo: Record<string, string> = {}
    ordinati.forEach((p, i) => {
      const giro = Math.floor(i / numSquadre)
      const pos = i % numSquadre
      nuovo[p.id] = String(giro % 2 ? numSquadre - 1 - pos : pos)
    })
    setSquadraDi(nuovo)
  }

  const forzaSquadra = (i: number) => {
    const membri = nelTorneo.filter((p) => squadraDi[p.id] === String(i))
    return { n: membri.length, media: membri.length ? membri.reduce((s, p) => s + p.forza, 0) / membri.length : 0 }
  }

  return (
    <ActionForm action={creaTorneo} className="space-y-4 pb-20">
      <input type="hidden" name="legaId" value={legaId} />
      <input type="hidden" name="numSquadre" value={numSquadre} />

      <Card className="space-y-4">
        <Field label="Nome del torneo">
          <input name="nome" required minLength={2} maxLength={60} placeholder="Es. Torneo d'autunno" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Squadre">
            <select value={numSquadre} onChange={(e) => setNumSquadre(Number(e.target.value))} className={inputClass}>
              {SQUADRE_PREDEFINITE.map((_, i) =>
                i < 1 ? null : (
                  <option key={i} value={i + 1}>
                    {i + 1} squadre
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Formato">
            <select disabled className={inputClass}>
              <option>Girone all&apos;italiana</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="andataRitorno" checked={andataRitorno} onChange={(e) => setAndataRitorno(e.target.checked)} />
          Andata e ritorno
        </label>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Squadre e giocatori</h2>
          <button type="button" onClick={bilancia} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
            ⚖️ Bilancia
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Scegli la squadra di ogni giocatore, oppure tocca “Bilancia”: divide i giocatori scelti (o tutta la rosa) in squadre equilibrate.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {squadre.map((s, i) => {
            const { n, media } = forzaSquadra(i)
            return (
              <div key={i} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800" style={{ borderLeft: `4px solid ${s.colore}` }}>
                <input
                  name={`nome_${i}`}
                  value={nomi[i]}
                  onChange={(e) => setNomi((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                  required
                  maxLength={30}
                  aria-label={`Nome squadra ${i + 1}`}
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
                <p className="text-xs text-zinc-500">
                  {n} giocator{n === 1 ? 'e' : 'i'}
                  {n > 0 && ` · forza ${media.toFixed(1)}`}
                </p>
              </div>
            )
          })}
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rosa.map((p) => {
            const scelta = squadraDi[p.id] ?? ''
            const colore = scelta !== '' ? SQUADRE_PREDEFINITE[Number(scelta)]?.colore : undefined
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate text-sm">
                  {p.nome}
                  {p.ruolo && <span className="text-xs text-zinc-500"> · {p.ruolo}</span>}
                </span>
                <select
                  name={`squadra_${p.id}`}
                  value={Number(scelta) < numSquadre ? scelta : ''}
                  onChange={(e) => setSquadraDi((v) => ({ ...v, [p.id]: e.target.value }))}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  style={colore ? { borderColor: colore } : undefined}
                >
                  <option value="">Non gioca</option>
                  {squadre.map((s, i) => (
                    <option key={i} value={i}>
                      {nomi[i] || s.nome}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Calendario</h2>
        <Field label="Prima giornata">
          <DatePicker name="inizio" withTime required defaultValue={inizio} placeholder="Scegli giorno e ora" />
        </Field>
        <Field label="Giornate">
          <select name="ogniGiorni" value={ogniGiorni} onChange={(e) => setOgniGiorni(Number(e.target.value))} className={inputClass}>
            {FREQUENZE.map((f) => (
              <option key={f.giorni} value={f.giorni}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Campo / luogo">
            <input name="luogo" required placeholder="Centro sportivo…" className={inputClass} />
          </Field>
          <Field label="Durata partita (min)">
            <input name="durataMinuti" type="number" min={10} max={300} step={5} required defaultValue={40} className={inputClass} />
          </Field>
        </div>
        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
          📋 {calendario.length} giornat{calendario.length === 1 ? 'a' : 'e'} · {calendario.flat().length} partite
          {numSquadre % 2 === 1 && ' · a ogni giornata una squadra riposa'}. Le partite della stessa giornata si giocano una dopo l&apos;altra.
        </p>
      </Card>

      <PillSalva label="Crea torneo" quando="completo" />
    </ActionForm>
  )
}
