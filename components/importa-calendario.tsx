'use client'

import { useActionState, useMemo, useState } from 'react'
import { importaEventi, leggiCalendario, type FormState, type LetturaCalendario } from '@/app/actions'
import { useT } from './lingua'
import { buttonClass, inputClass } from './ui-classes'
import { MAX_ALLENAMENTO } from '@/lib/limiti'

type Scelta = 'partita' | 'allenamento' | 'salta'

// Da un evento del calendario: allenamento se lo dice il titolo, altrimenti partita; già presente nella lega → salta.
const indovina = (e: { titolo: string; presente: boolean }): Scelta =>
  e.presente ? 'salta' : /allen|training|entren|entraîn|trainin/i.test(e.titolo) ? 'allenamento' : 'partita'

const chip = (attivo: boolean, colore: string) =>
  `rounded-full border px-2.5 py-1 text-xs font-semibold transition ${attivo ? colore : 'border-zinc-300 text-zinc-500 dark:border-zinc-700'}`

// Importa un calendario esterno: 1) file .ics o link, 2) per ogni evento partita / allenamento / salta, 3) crea.
export function ImportaCalendario({ legaId }: { legaId: string }) {
  const t = useT()
  const [lettura, leggi, leggendo] = useActionState<LetturaCalendario | undefined, FormData>(leggiCalendario.bind(null, legaId), undefined)
  const eventi = useMemo(() => lettura?.eventi ?? [], [lettura])
  const [scelte, setScelte] = useState<Record<string, Scelta>>({})
  const [letturaVista, setLetturaVista] = useState(lettura)
  // a ogni nuova lettura si riparte dalle scelte proposte
  if (lettura !== letturaVista) {
    setLetturaVista(lettura)
    setScelte(Object.fromEntries(eventi.map((e) => [e.chiave, indovina(e)])))
  }
  const [esito, importa, importando] = useActionState<FormState, FormData>(importaEventi.bind(null, legaId), undefined)

  const daCreare = eventi.filter((e) => (scelte[e.chiave] ?? 'salta') !== 'salta')
  const tutte = (s: Scelta) => setScelte(Object.fromEntries(eventi.map((e) => [e.chiave, e.presente && s !== 'salta' ? (scelte[e.chiave] ?? 'salta') : s])))
  const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const

  return (
    <div className="space-y-4">
      <form action={leggi} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">
          {t('Carica il file .ics esportato dal tuo calendario, oppure incolla il link pubblico (Google Calendar: “Indirizzo segreto in formato iCal”).')}
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">📄 {t('File del calendario (.ics)')}</span>
          <input name="file" type="file" accept=".ics,text/calendar" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">🔗 {t('oppure link del calendario')}</span>
          <input name="link" type="url" inputMode="url" autoComplete="off" placeholder="https://… / webcal://…" className={inputClass} />
        </label>
        <button type="submit" disabled={leggendo} className={`${buttonClass('secondary')} w-full`}>
          {leggendo ? t('Leggo…') : `📥 ${t('Leggi il calendario')}`}
        </button>
        {lettura?.error && <p className="text-sm text-red-600 dark:text-red-400">{lettura.error}</p>}
      </form>

      {eventi.length > 0 && (
        <form action={importa} className="space-y-4">
          <input type="hidden" name="eventi" value={JSON.stringify(daCreare.map((e) => ({ inizio: e.inizio, fine: e.fine, titolo: e.titolo, luogo: e.luogo, tipo: scelte[e.chiave] })))} />

          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="font-semibold">{t('{n} eventi trovati', { n: eventi.length })}</h2>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => tutte('partita')} className={chip(false, '')}>⚽ {t('Tutti')}</button>
                <button type="button" onClick={() => tutte('allenamento')} className={chip(false, '')}>🏃 {t('Tutti')}</button>
                <button type="button" onClick={() => tutte('salta')} className={chip(false, '')}>✕ {t('Nessuno')}</button>
              </div>
            </div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {eventi.map((e) => {
                const s = scelte[e.chiave] ?? 'salta'
                const metti = (x: Scelta) => setScelte((v) => ({ ...v, [e.chiave]: x }))
                return (
                  <li key={e.chiave} className={`space-y-2 px-4 py-3 ${s === 'salta' ? 'opacity-60' : ''}`}>
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold capitalize">{t.data(e.inizio, breve)}</p>
                      <p className="truncate text-zinc-500">
                        {e.titolo || t('Senza titolo')}
                        {e.luogo && ` · 📍 ${e.luogo}`}
                      </p>
                      {e.presente && <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">⚠️ {t('C’è già un evento a quest’ora nella lega')}</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => metti('partita')} className={chip(s === 'partita', 'border-green-600 bg-green-600 text-white')}>
                        ⚽ {t('Partita')}
                      </button>
                      <button type="button" onClick={() => metti('allenamento')} className={chip(s === 'allenamento', 'border-sky-600 bg-sky-600 text-white')}>
                        🏃 {t('Allenamento')}
                      </button>
                      <button type="button" onClick={() => metti('salta')} className={chip(s === 'salta', 'border-zinc-500 bg-zinc-500 text-white')}>
                        ✕ {t('Salta')}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            {!!lettura?.tuttoIlGiorno && (
              <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
                {t('{n} eventi “tutto il giorno” non hanno un orario e non sono in elenco.', { n: lettura.tuttoIlGiorno })}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">📣 {t('Convocazioni per tutti gli eventi')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="font-medium">{t('Aprono (giorni prima)')}</span>
                <input name="aperturaGiorni" type="number" min={0} max={14} defaultValue={3} className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">{t('alle')}</span>
                <input name="aperturaOra" type="time" defaultValue="10:00" className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">{t('Chiudono (ore prima)')}</span>
                <input name="chiusuraOre" type="number" min={0} max={48} defaultValue={2} className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">{t('Quota a testa (€)')}</span>
                <input name="quota" type="number" min={0} step="0.5" className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="font-medium">🏃 {t('Posti agli allenamenti')}</span>
                <input name="postiAllenamento" type="number" min={2} max={MAX_ALLENAMENTO} defaultValue={16} className={inputClass} />
              </label>
            </div>
            <p className="text-xs text-zinc-500">{t('Le partite usano il numero in base alle convocazioni. Ogni evento si può modificare dopo, uno per uno.')}</p>
          </div>

          {esito?.error && <p className="text-sm text-red-600 dark:text-red-400">{esito.error}</p>}
          <button type="submit" disabled={importando || daCreare.length === 0} className={`${buttonClass('primary')} w-full py-3`}>
            {importando ? t('Creo…') : t('Crea {n} eventi', { n: daCreare.length })}
          </button>
        </form>
      )}
    </div>
  )
}
