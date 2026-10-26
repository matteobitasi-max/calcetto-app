'use client'

import { useState } from 'react'
import { creaTorneo } from '@/app/actions'
import { ActionForm } from '@/components/action-form'
import { DatePicker } from '@/components/date-picker'
import { PillSalva } from '@/components/pill-salva'
import { Card, Field } from '@/components/ui-base'
import { inputClass } from '@/components/ui-classes'
import { LETTERE_GIRONI, SQUADRE_PREDEFINITE, gironiDiBase, giornate, nomePredefinito } from '@/lib/girone'
import { nomeTurno, partitePerTurno, turniTabellone } from '@/lib/tabellone'
import { SquadreEditor, type GiocatoreRosa } from '../squadre-editor'
import { PrimoTurnoEditor } from './primo-turno-editor'
import { GironiEditor } from './gironi-editor'
import { useT } from '@/components/lingua'

const FREQUENZE = [
  { giorni: 7, girone: 'Una giornata a settimana', tabellone: 'Un turno a settimana' },
  { giorni: 14, girone: 'Una giornata ogni 2 settimane', tabellone: 'Un turno ogni 2 settimane' },
  { giorni: 1, girone: 'Una giornata al giorno', tabellone: 'Un turno al giorno' },
  { giorni: 0, girone: 'Tutto in un giorno (partite una dopo l’altra)', tabellone: 'Tutto in un giorno (partite una dopo l’altra)' },
]

// Nuovo torneo: girone all'italiana, eliminazione diretta o gironi + tabellone, squadre (spostando i giocatori) e calendario.
export function TorneoForm({ legaId, rosa, inizio }: { legaId: string; rosa: GiocatoreRosa[]; inizio?: string }) {
  const t = useT()
  const [formato, setFormato] = useState<'girone' | 'eliminazione' | 'gironi'>('girone')
  const [numGironi, setNumGironi] = useState(2)
  const [qualificate, setQualificate] = useState(2)
  const [numSquadre, setNumSquadre] = useState(Math.min(4, Math.max(2, rosa.length)))
  const [andataRitorno, setAndataRitorno] = useState(false)
  const [ogniGiorni, setOgniGiorni] = useState(7)
  const nomiPredefiniti = SQUADRE_PREDEFINITE.map((_, i) => nomePredefinito(i, t.lingua))
  const [nomi, setNomi] = useState(nomiPredefiniti)
  const [foto, setFoto] = useState<(string | null)[]>([])

  const massimo = Math.min(SQUADRE_PREDEFINITE.length, rosa.length)
  const calendario = giornate(numSquadre, andataRitorno)
  const turni = turniTabellone(numSquadre)
  const perTurno = partitePerTurno(numSquadre)

  // Gironi + tabellone: gironi possibili (almeno 2 squadre ciascuno) e quante ne passano (mai tutte).
  const maxGironi = Math.min(LETTERE_GIRONI.length, Math.floor(numSquadre / 2))
  const gironiOk = Math.max(2, Math.min(numGironi, maxGironi))
  const piccolo = Math.floor(numSquadre / gironiOk)
  const qualificateOk = Math.min(qualificate, Math.max(1, piccolo - 1))
  const grandezze = LETTERE_GIRONI.slice(0, gironiOk).map((_, g) => gironiDiBase(numSquadre, gironiOk).filter((x) => x === g).length)
  const partiteGironi = grandezze.reduce((s, n) => s + giornate(n).flat().length, 0)
  const qualificateTot = gironiOk * qualificateOk
  const turniFinale = turniTabellone(qualificateTot)

  return (
    <ActionForm action={creaTorneo} className="space-y-4 pb-20">
      <input type="hidden" name="legaId" value={legaId} />
      <input type="hidden" name="numSquadre" value={numSquadre} />

      <Card className="space-y-4">
        <Field label={t('Nome del torneo')}>
          <input name="nome" required minLength={2} maxLength={60} placeholder={t('Es. Torneo d’autunno')} className={inputClass} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ['girone', '🔁 Girone', 'Tutti contro tutti, classifica a punti'],
              ['eliminazione', '🏆 Tabellone', 'Eliminazione diretta fino alla finale'],
              ['gironi', '🔀 Gironi + tabellone', 'Prima i gironi, poi scontri diretti tra le migliori'],
            ] as const
          ).map(([valore, titolo, sotto]) => (
            <label
              key={valore}
              className={`relative cursor-pointer rounded-xl border-2 p-3 ${formato === valore ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <input type="radio" name="formato" value={valore} checked={formato === valore} onChange={() => setFormato(valore)} className="sr-only" />
              <span className="block font-semibold">{t(titolo)}</span>
              <span className="block text-xs text-zinc-500">{t(sotto)}</span>
            </label>
          ))}
        </div>
        <Field label={t('Numero di squadre')}>
          <select value={numSquadre} onChange={(e) => setNumSquadre(Number(e.target.value))} className={inputClass}>
            {Array.from({ length: Math.max(1, massimo - 1) }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {t('{n} squadre', { n })}
              </option>
            ))}
          </select>
        </Field>
        {formato === 'girone' ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="andataRitorno" checked={andataRitorno} onChange={(e) => setAndataRitorno(e.target.checked)} />
            {t('Andata e ritorno')}
          </label>
        ) : null}
        {formato === 'gironi' &&
          (maxGironi < 2 ? (
            <p className="text-sm text-red-600">{t('Per fare almeno 2 gironi servono almeno 4 squadre.')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('Gironi')}>
                <select name="numGironi" value={gironiOk} onChange={(e) => setNumGironi(Number(e.target.value))} className={inputClass}>
                  {Array.from({ length: maxGironi - 1 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>
                      {t('{n} gironi', { n })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('Passano per girone')}>
                <select name="qualificate" value={qualificateOk} onChange={(e) => setQualificate(Number(e.target.value))} className={inputClass}>
                  <option value={1}>{t('La prima')}</option>
                  {piccolo > 2 && <option value={2}>{t('Le prime 2')}</option>}
                </select>
              </Field>
            </div>
          ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('Squadre e giocatori')}</h2>
        <Field label={t('Giocatori massimi per squadra (facoltativo)')}>
          <input name="maxGiocatori" type="number" min={1} max={50} placeholder={t('Nessun limite')} className={inputClass} />
        </Field>
        <SquadreEditor
          rosa={rosa}
          numSquadre={numSquadre}
          nomiIniziali={nomiPredefiniti}
          onNomi={setNomi}
          onFoto={(i, url) => setFoto((v) => Object.assign([...v], { [i]: url }))}
        />
      </Card>

      {formato === 'gironi' && maxGironi >= 2 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('Gironi')}</h2>
          <GironiEditor key={`${numSquadre}-${gironiOk}`} numSquadre={numSquadre} numGironi={gironiOk} nomi={nomi} foto={foto} />
        </Card>
      )}

      {formato === 'eliminazione' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('Tabellone')}</h2>
          <PrimoTurnoEditor key={numSquadre} numSquadre={numSquadre} nomi={nomi} foto={foto} />
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('Calendario')}</h2>
        <Field label={formato === 'eliminazione' ? t('Primo turno') : t('Prima giornata')}>
          <DatePicker name="inizio" withTime required defaultValue={inizio} placeholder={t('Scegli giorno e ora')} />
        </Field>
        <Field label={formato === 'eliminazione' ? t('Turni') : t('Giornate')}>
          <select name="ogniGiorni" value={ogniGiorni} onChange={(e) => setOgniGiorni(Number(e.target.value))} className={inputClass}>
            {FREQUENZE.map((f) => (
              <option key={f.giorni} value={f.giorni}>
                {t(formato === 'eliminazione' ? f.tabellone : f.girone)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Campo / luogo')}>
            <input name="luogo" required placeholder={t('Centro sportivo…')} className={inputClass} />
          </Field>
          <Field label={t('Durata partita (min)')}>
            <input name="durataMinuti" type="number" min={10} max={300} step={5} required defaultValue={40} className={inputClass} />
          </Field>
        </div>
        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
          {formato === 'girone' ? (
            <>
              📋 {t.n(calendario.length, '{n} giornata', '{n} giornate')} · {t('{n} partite', { n: calendario.flat().length })}
              {numSquadre % 2 === 1 && ` · ${t('a ogni giornata una squadra riposa')}`}.
            </>
          ) : formato === 'gironi' ? (
            <>
              🔀 {t('{n} gironi da {grandezze} squadre · {partite} partite nei gironi.', { n: gironiOk, grandezze: grandezze.join(', '), partite: partiteGironi })}{' '}
              {qualificateOk === 1
                ? t('Poi passa la prima di ogni girone ({n} squadre):', { n: qualificateTot })
                : t('Poi passano le prime 2 di ogni girone ({n} squadre):', { n: qualificateTot })}{' '}
              {Array.from({ length: turniFinale }, (_, i) => nomeTurno(i + 1, turniFinale, t)).join(' → ')}
              {t(', con incroci tra gironi diversi. Il tabellone si crea da solo alla fine dei gironi.')}
            </>
          ) : (
            <>
              🏆 {perTurno.map((n, i) => `${nomeTurno(i + 1, turni, t)} (${n})`).join(' → ')} · {t('{n} partite', { n: numSquadre - 1 })}.{' '}
              {t('Se in un turno le squadre sono dispari, l’ultima passa direttamente. I turni dopo si creano da soli con i risultati.')}
            </>
          )}{' '}
          {t('Le partite dello stesso turno si giocano una dopo l’altra.')}
        </p>
      </Card>

      <PillSalva label={t('Crea torneo')} quando="completo" />
    </ActionForm>
  )
}
