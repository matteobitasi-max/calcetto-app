'use client'

import { useState, useTransition } from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { readSheet } from 'read-excel-file/browser'
import { importaGiocatori, type EsitoImport, type RigaImport } from '@/app/actions'
import { Card, Field } from '@/components/ui-base'
import { buttonClass, inputClass } from '@/components/ui-classes'
import { useT } from '@/components/lingua'
import { RUOLI } from '@/lib/roster'

export type LegaImport = {
  id: string
  nome: string
  /** Link firmato al modello Excel della lega (con i menu dei tornei e delle squadre). */
  modello: string
  rosa: { nome: string; cognome?: string; email?: string }[]
  tornei: { id: string; nome: string; squadre: { key: string; nome: string; giocatori: number }[]; max?: number }[]
}

const normalizza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Intestazioni riconosciute (in italiano o in inglese) → campo.
const COLONNE: Record<string, keyof RigaImport | 'nomeCompleto'> = {
  nome: 'nome', name: 'nome', 'first name': 'nome', firstname: 'nome',
  cognome: 'cognome', surname: 'cognome', 'last name': 'cognome', lastname: 'cognome',
  email: 'email', 'e-mail': 'email', mail: 'email', 'indirizzo email': 'email',
  telefono: 'telefono', tel: 'telefono', cellulare: 'telefono', phone: 'telefono', mobile: 'telefono',
  soprannome: 'soprannome', nickname: 'soprannome',
  ruolo: 'ruolo', role: 'ruolo',
  torneo: 'torneo', tournament: 'torneo',
  squadra: 'squadra', team: 'squadra',
  'nome e cognome': 'nomeCompleto', giocatore: 'nomeCompleto', 'nome cognome': 'nomeCompleto', 'full name': 'nomeCompleto',
  // spagnolo, tedesco, francese
  nombre: 'nome', apellido: 'cognome', apellidos: 'cognome', correo: 'email', 'correo electronico': 'email', apodo: 'soprannome', posicion: 'ruolo', equipo: 'squadra',
  vorname: 'nome', nachname: 'cognome', telefon: 'telefono', handy: 'telefono', spitzname: 'soprannome', position: 'ruolo', mannschaft: 'squadra', turnier: 'torneo',
  prenom: 'nome', nom: 'cognome', courriel: 'email', telephone: 'telefono', surnom: 'soprannome', poste: 'ruolo', equipe: 'squadra', tournoi: 'torneo',
}

// CSV con ";" o "," e virgolette.
function leggiCsv(testo: string): string[][] {
  const separatore = (testo.split('\n')[0].match(/;/g)?.length ?? 0) >= (testo.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const righe: string[][] = []
  let riga: string[] = []
  let cella = ''
  let tra = false
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]
    if (tra) {
      if (c === '"' && testo[i + 1] === '"') {
        cella += '"'
        i++
      } else if (c === '"') tra = false
      else cella += c
    } else if (c === '"') tra = true
    else if (c === separatore) {
      riga.push(cella)
      cella = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && testo[i + 1] === '\n') i++
      riga.push(cella)
      righe.push(riga)
      riga = []
      cella = ''
    } else cella += c
  }
  if (cella || riga.length) {
    riga.push(cella)
    righe.push(riga)
  }
  return righe
}

// Dalle righe del foglio (la prima è l'intestazione) ai giocatori.
function inGiocatori(tabella: unknown[][]): RigaImport[] {
  const celle = tabella.map((r) => r.map((c) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim())))
  const piene = celle.filter((r) => r.some(Boolean))
  if (!piene.length) return []
  const intestazione = piene[0].map((h) => COLONNE[normalizza(h.replace(/\*|\(.*?\)/g, ''))])
  const conIntestazione = intestazione.some(Boolean)
  // senza intestazione riconosciuta: nome, cognome, email
  const campi = conIntestazione ? intestazione : (['nome', 'cognome', 'email'] as const)
  return (conIntestazione ? piene.slice(1) : piene).map((r) => {
    const g: RigaImport = {}
    campi.forEach((campo, i) => {
      const v = r[i]
      if (!campo || !v) return
      if (campo === 'nomeCompleto') {
        const [n, ...c] = v.split(' ')
        g.nome ??= n
        if (c.length) g.cognome ??= c.join(' ')
      } else g[campo] = v
    })
    // un'email scritta nella colonna sbagliata
    if (!g.email && g.nome?.includes('@')) {
      g.email = g.nome
      g.nome = undefined
    }
    return g
  })
}

export function ImportaGiocatori({ leghe }: { leghe: LegaImport[] }) {
  const t = useT()
  const [legaId, setLegaId] = useState(leghe[0].id)
  const [torneoId, setTorneoId] = useState('')
  const [squadraKey, setSquadraKey] = useState('')
  const [invita, setInvita] = useState(true)
  const [righe, setRighe] = useState<RigaImport[]>([])
  const [file, setFile] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<EsitoImport | null>(null)
  const [pending, startTransition] = useTransition()

  const lega = leghe.find((l) => l.id === legaId)!
  const torneo = lega.tornei.find((tr) => tr.id === torneoId)

  // stato di ogni riga rispetto alla rosa della lega scelta
  const anteprima = (() => {
    const email = new Set(lega.rosa.map((p) => p.email?.toLowerCase()).filter(Boolean))
    const nomi = new Set(lega.rosa.map((p) => normalizza(`${p.nome} ${p.cognome ?? ''}`)))
    return righe.map((r) => {
      const nome = r.nome || r.email?.split('@')[0]
      const stato: 'nuovo' | 'presente' | 'errore' =
        !nome || (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
          ? 'errore'
          : (r.email && email.has(r.email.toLowerCase())) || nomi.has(normalizza(`${nome} ${r.cognome ?? ''}`))
            ? 'presente'
            : 'nuovo'
      return { ...r, stato }
    })
  })()

  const carica = async (f: File) => {
    setErrore(null)
    setEsito(null)
    setFile(f.name)
    try {
      const tabella = /\.csv$|\.txt$/i.test(f.name) ? leggiCsv(await f.text()) : await readSheet(f)
      const lette = inGiocatori(tabella as unknown[][])
      if (!lette.length) setErrore(t('Nel file non ho trovato giocatori.'))
      setRighe(lette.slice(0, 300))
    } catch {
      setRighe([])
      setErrore(t('Non riesco a leggere il file: usa un Excel (.xlsx) o un CSV.'))
    }
  }

  const importa = () =>
    startTransition(async () => {
      const r = await importaGiocatori(legaId, torneoId || null, squadraKey || null, righe, invita)
      if (r.error) setErrore(r.error)
      else {
        setEsito(r)
        setRighe([])
        setFile('')
      }
    })

  const validi = anteprima.filter((r) => r.stato !== 'errore').length
  const etichetta = { nuovo: t('Nuovo'), presente: t('Già in rosa'), errore: t('Da correggere') }
  const coloreStato = {
    nuovo: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    presente: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    errore: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('Lega')}>
            <select
              value={legaId}
              onChange={(e) => {
                setLegaId(e.target.value)
                setTorneoId('')
                setSquadraKey('')
              }}
              className={inputClass}
            >
              {leghe.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Torneo (facoltativo)')}>
            <select
              value={torneoId}
              onChange={(e) => {
                setTorneoId(e.target.value)
                setSquadraKey('')
              }}
              disabled={!lega.tornei.length}
              className={inputClass}
            >
              <option value="">{lega.tornei.length ? t('Nessun torneo') : t('Nessun torneo attivo')}</option>
              {lega.tornei.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  🏆 {tr.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Squadra (facoltativa)')}>
            <select value={squadraKey} onChange={(e) => setSquadraKey(e.target.value)} disabled={!torneo} className={inputClass}>
              <option value="">{torneo ? t('Dalla colonna “Squadra”, o nessuna') : '—'}</option>
              {torneo?.squadre.map((sq) => (
                <option key={sq.key} value={sq.key}>
                  {sq.nome} ({sq.giocatori}
                  {torneo.max ? `/${torneo.max}` : ''})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="space-y-2">
          <label className={`${buttonClass('secondary')} w-full cursor-pointer justify-center sm:w-auto`}>
            📄 {file || t('Scegli il file Excel o CSV')}
            <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && carica(e.target.files[0])} />
          </label>
          <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
            <p>
              <b>{t('Obbligatorio')}</b>: {t('almeno uno tra')} <b>{t('Nome')}</b> {t('ed')} <b>Email</b> {t('(senza nome si usa la prima parte dell’email).')}
            </p>
            <p>
              <b>{t('Facoltativi')}</b>: {t('Cognome, Telefono, Soprannome')} · <b>{t('Ruolo')}</b> ({RUOLI.join(', ')}) · <b>{t('Torneo')}</b> {t('e')}{' '}
              <b>{t('Squadra')}</b> {t('(nel modello Excel li scegli dal menu a tendina; se il torneo è vuoto vale quello scelto qui sopra).')}
            </p>
            <p>{t('La prima riga è l’intestazione: le colonne possono essere in qualsiasi ordine.')}</p>
          </div>
          <p className="text-xs text-zinc-500">{' '}
            <a
              href={lega.modello}
              onClick={(e) => {
                // nell'app il download lo fa il browser di sistema (Safari / Chrome), che salva il file
                if (!Capacitor.isNativePlatform()) return
                e.preventDefault()
                Browser.open({ url: `${window.location.origin}${lega.modello}` }).catch(() => undefined)
              }}
              className="font-medium text-green-700 underline dark:text-green-400"
            >
              {t('Scarica il modello Excel di {lega}', { lega: lega.nome })}
            </a>
          </p>
        </div>
        {errore && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{errore}</p>}
      </Card>

      {anteprima.length > 0 && (
        <Card className="space-y-3 p-0! overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
            <h2 className="font-semibold">
              {t('Anteprima')} · {anteprima.length}
            </h2>
            <button type="button" disabled={pending || !validi} onClick={importa} className={`${buttonClass('primary')} disabled:opacity-50`}>
              {pending ? t('Importo…') : t('Importa {n} giocatori in {lega}', { n: validi, lega: lega.nome })}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {[t('Nome'), t('Cognome'), 'Email', t('Telefono'), t('Ruolo'), t('Torneo'), t('Squadra'), ''].map((h, i) => (
                    <th key={i} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {anteprima.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5">{r.nome}</td>
                    <td className="px-3 py-1.5">{r.cognome}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{r.email}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{r.telefono}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{r.ruolo}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{r.torneo || (r.squadra || squadraKey ? (torneo?.nome ?? '') : '')}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{r.squadra || (!r.torneo ? (torneo?.squadre.find((sq) => sq.key === squadraKey)?.nome ?? '') : '')}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${coloreStato[r.stato]}`}>{etichetta[r.stato]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-start gap-3 px-4 text-sm">
            <input type="checkbox" checked={invita} onChange={(e) => setInvita(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-green-600" />
            <span>
              ✉️ {t('Manda l’invito per email')}
              <span className="block text-xs text-zinc-500">
                {t('A chi ha l’email nel file e non ha ancora un account arriva un’email con il link per registrarsi ed entrare nella lega.')}
              </span>
            </span>
          </label>
          <p className="px-4 pb-4 text-xs text-zinc-500">
            {t('Chi è già in rosa (stessa email, o stesso nome e cognome) non viene duplicato. Quando un giocatore si registra con la stessa email, la sua scheda si collega da sola.')}
          </p>
        </Card>
      )}

      {esito && (
        <Card className="space-y-2 border-green-600">
          <p className="font-semibold">
            ✅{' '}
            {t('{creati} creati, {riattivati} riattivati, {presenti} già in rosa', {
              creati: esito.creati ?? 0,
              riattivati: esito.riattivati ?? 0,
              presenti: esito.giaPresenti ?? 0,
            })}
            {!!esito.inSquadra && ` · ${t('{n} messi in squadra', { n: esito.inSquadra })}`}
            {!!esito.invitati && ` · ✉️ ${t('{n} inviti mandati', { n: esito.invitati })}`}
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300">
            {esito.righe
              ?.filter((r) => r.esito === 'errore' || r.nota)
              .map((r) => (
                <li key={r.riga}>
                  {t('Riga {n}', { n: r.riga })} · {r.nome}: {r.esito === 'errore' ? '⚠️ ' : ''}
                  {r.nota}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
