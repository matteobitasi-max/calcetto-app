'use client'

import { useEffect, useRef, useState } from 'react'
import type { Campo } from '@/lib/campo'
import { linkMappa } from '@/lib/campo'
import { inputClass } from './ui-classes'
import { useT } from './lingua'

export type CampoUsato = { luogo: string; campo?: Campo }
type Suggerimento = { id: string; nome: string; dettaglio?: string }

const nuovaSessione = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^\w-]/g, '')

// Il campo della partita: si scrive come prima oppure si sceglie un posto vero. Mentre si scrive compaiono
// i campi già usati dalla lega e (con la ricerca di Google Maps accesa) i posti trovati su Google.
// Scelto un posto, si salvano anche indirizzo e coordinate (campo nascosto "campo"): così la partita ha il
// link alla mappa e il meteo del campo. Cambiando il testo a mano, il posto scelto si scollega.
export function CampoInput({
  defaultLuogo,
  defaultCampo,
  usati = [],
  ricerca,
  placeholder,
  maxLength,
}: {
  defaultLuogo?: string
  defaultCampo?: Campo | null
  usati?: CampoUsato[]
  ricerca: boolean
  placeholder?: string
  maxLength?: number
}) {
  const t = useT()
  const [testo, setTesto] = useState(defaultLuogo ?? '')
  const [campo, setCampo] = useState<Campo | null>(defaultCampo ?? null)
  const [aperto, setAperto] = useState(false)
  const [trovati, setTrovati] = useState<Suggerimento[]>([])
  const [cerco, setCerco] = useState(false)
  const [errore, setErrore] = useState(false)
  const sessione = useRef(nuovaSessione())
  const box = useRef<HTMLDivElement>(null)
  const campoNascosto = useRef<HTMLInputElement>(null)

  // il modulo deve accorgersi della scelta (pillola "Salva"): si avvisa dopo che i campi sono aggiornati
  const avvisaModulo = () => setTimeout(() => campoNascosto.current?.form?.dispatchEvent(new Event('input', { bubbles: true })), 0)

  // ricerca su Google, mezzo secondo dopo l'ultima lettera
  useEffect(() => {
    const q = testo.trim()
    if (!ricerca || !aperto || campo || q.length < 3) return
    const ctrl = new AbortController()
    const attesa = setTimeout(async () => {
      setCerco(true)
      setErrore(false)
      try {
        const r = await fetch(`/api/campi?${new URLSearchParams({ q, s: sessione.current })}`, { signal: ctrl.signal })
        const dati = (await r.json()) as { suggerimenti?: Suggerimento[] }
        if (!r.ok) throw new Error()
        setTrovati(dati.suggerimenti ?? [])
      } catch {
        if (!ctrl.signal.aborted) setErrore(true)
      } finally {
        if (!ctrl.signal.aborted) setCerco(false)
      }
    }, 450)
    return () => {
      clearTimeout(attesa)
      ctrl.abort()
    }
  }, [testo, aperto, campo, ricerca])

  // toccando fuori si chiude
  useEffect(() => {
    if (!aperto) return
    const chiudi = (e: MouseEvent | TouchEvent) => {
      if (!box.current?.contains(e.target as Node)) setAperto(false)
    }
    document.addEventListener('mousedown', chiudi)
    document.addEventListener('touchstart', chiudi)
    return () => {
      document.removeEventListener('mousedown', chiudi)
      document.removeEventListener('touchstart', chiudi)
    }
  }, [aperto])

  const q = testo.trim().toLowerCase()
  // i risultati di Google valgono solo mentre si cerca (non dopo una scelta o con meno di 3 lettere)
  const cercaAttiva = ricerca && aperto && !campo && q.length >= 3
  const trovatiOra = cercaAttiva ? trovati : []
  const cercoOra = cercaAttiva && cerco
  const erroreOra = cercaAttiva && errore
  const giaUsati = usati.filter((u) => u.luogo.toLowerCase() !== q && (!q || u.luogo.toLowerCase().includes(q))).slice(0, 4)

  const scegliUsato = (u: CampoUsato) => {
    setTesto(u.luogo)
    setCampo(u.campo ?? null)
    setAperto(false)
    avvisaModulo()
  }

  const scegliTrovato = async (s: Suggerimento) => {
    setAperto(false)
    setTesto(s.nome)
    setCerco(true)
    try {
      const r = await fetch(`/api/campi?${new URLSearchParams({ id: s.id, s: sessione.current })}`)
      const dati = (await r.json()) as { posto?: Campo & { nome: string } }
      if (r.ok && dati.posto) {
        const { nome, ...posto } = dati.posto
        setTesto(nome || s.nome)
        setCampo(posto)
      }
    } catch {
      // resta il nome scritto
    } finally {
      setCerco(false)
      // la scelta chiude la sessione di Google: la prossima ricerca ne apre un'altra
      sessione.current = nuovaSessione()
      avvisaModulo()
    }
  }

  const mostra = aperto && (giaUsati.length > 0 || trovatiOra.length > 0 || cercoOra || erroreOra)

  return (
    <div ref={box} className="relative">
      <input
        name="luogo"
        required
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder ?? (ricerca ? t('Cerca il centro sportivo…') : t('Centro sportivo…'))}
        value={testo}
        onChange={(e) => {
          setTesto(e.target.value)
          setCampo(null)
          setAperto(true)
        }}
        onFocus={() => setAperto(true)}
        className={inputClass}
      />
      <input ref={campoNascosto} type="hidden" name="campo" value={campo ? JSON.stringify(campo) : ''} />

      {campo && (
        <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          <span className="min-w-0 flex-1 truncate">📍 {campo.indirizzo ?? t('Posizione sulla mappa')}</span>
          <a href={linkMappa(testo, campo)} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium text-green-700 hover:underline dark:text-green-400">
            {t('Mappa')} ↗
          </a>
          <button
            type="button"
            onClick={() => {
              setCampo(null)
              avvisaModulo()
            }}
            aria-label={t('Togli il posto sulla mappa')}
            className="shrink-0 rounded px-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </p>
      )}

      {mostra && (
        <div role="listbox" className="absolute inset-x-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {giaUsati.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('Campi già usati')}</p>
              {giaUsati.map((u) => (
                <button key={u.luogo} type="button" role="option" aria-selected={false} onClick={() => scegliUsato(u)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <span aria-hidden>{u.campo ? '📍' : '🏟️'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.luogo}</span>
                    {u.campo?.indirizzo && <span className="block truncate text-xs text-zinc-500">{u.campo.indirizzo}</span>}
                  </span>
                </button>
              ))}
            </>
          )}
          {(trovatiOra.length > 0 || cercoOra || erroreOra) && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('Sulla mappa')}</p>
              {trovatiOra.map((s) => (
                <button key={s.id} type="button" role="option" aria-selected={false} onClick={() => scegliTrovato(s)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <span aria-hidden>📍</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.nome}</span>
                    {s.dettaglio && <span className="block truncate text-xs text-zinc-500">{s.dettaglio}</span>}
                  </span>
                </button>
              ))}
              {cercoOra && trovatiOra.length === 0 && <p className="px-3 py-2 text-zinc-500">{t('Cerco…')}</p>}
              {erroreOra && <p className="px-3 py-2 text-zinc-500">{t('Ricerca non disponibile: scrivi il nome del campo.')}</p>}
              {/* i risultati di Google vanno indicati come tali */}
              <p className="px-3 pb-1 pt-2 text-right text-[10px] text-zinc-400">powered by Google</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
