'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from './lingua'

type Gruppo = { chiave: string; tipo: number; coperto: boolean; prezzoOra: number; campi: number }
type CentroPubblico = { id: string; nome: string; modo: 'auto' | 'richiesta'; apre: string; chiude: string; gruppi: Gruppo[] }

// Nel modulo di una nuova partita: se il campo scelto dalla mappa è un centro sportivo su The Cap, si prenota
// il campo da qui. Per il giorno scelto si vedono TUTTI i tipi di campo (a 5, a 7…, dentro o fuori) con i
// loro orari liberi: un tocco su un orario sceglie insieme il tipo di campo e l'ora della partita.
// Legge dal modulo il posto ("campo"), la data ("data"), la durata ("durataMinuti") e "ripeti".
export function PrenotaCentro() {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  const [posto, setPosto] = useState<string | null>(null)
  const [quando, setQuando] = useState({ data: '', durata: 60, ripeti: false })
  const [centro, setCentro] = useState<CentroPubblico | null>(null)
  const [attiva, setAttiva] = useState(true)
  const [gruppo, setGruppo] = useState('')
  const [liberi, setLiberi] = useState<{ chiave: string; perGruppo: Record<string, string[]> } | null>(null)

  // segue il modulo: posto scelto, giorno e ora, durata, partita ricorrente
  useEffect(() => {
    const form = box.current?.closest('form')
    if (!form) return
    const leggi = () => {
      const fd = new FormData(form)
      let placeId: string | null = null
      try {
        placeId = (JSON.parse(String(fd.get('campo') || 'null')) as { placeId?: string } | null)?.placeId ?? null
      } catch {}
      const nuovo = { data: String(fd.get('data') ?? ''), durata: Number(fd.get('durataMinuti')) || 60, ripeti: fd.get('ripeti') === 'on' }
      setPosto((x) => (x === placeId ? x : placeId))
      setQuando((x) => (x.data === nuovo.data && x.durata === nuovo.durata && x.ripeti === nuovo.ripeti ? x : nuovo))
    }
    const avvio = setTimeout(leggi, 300)
    form.addEventListener('input', leggi)
    form.addEventListener('change', leggi)
    return () => {
      clearTimeout(avvio)
      form.removeEventListener('input', leggi)
      form.removeEventListener('change', leggi)
    }
  }, [])

  // il posto è un centro su The Cap?
  useEffect(() => {
    if (!posto) return
    const ctrl = new AbortController()
    fetch(`/api/centri?${new URLSearchParams({ posto })}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { centro: CentroPubblico | null }) => setCentro(d.centro))
      .catch(() => {})
    return () => ctrl.abort()
  }, [posto])

  const giorno = quando.data.slice(0, 10)
  const ora = quando.data.slice(11, 16)
  const chiave = centro && giorno ? `${centro.id}|${giorno}|${quando.durata}` : ''

  // gli orari liberi del giorno, per tutti i tipi di campo
  useEffect(() => {
    if (!chiave) return
    const [id, d, durata] = chiave.split('|')
    const ctrl = new AbortController()
    fetch(`/api/centri/liberi?${new URLSearchParams({ centro: id, giorno: d, durata })}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((x: { perGruppo?: Record<string, string[]> }) => setLiberi({ chiave, perGruppo: x.perGruppo ?? {} }))
      .catch(() => {})
    return () => ctrl.abort()
  }, [chiave])

  if (!posto || !centro || centro.gruppi.length === 0) return <div ref={box} />

  const perGruppo = liberi?.chiave === chiave ? liberi.perGruppo : null
  // il tipo scelto: quello toccato, altrimenti il primo che è libero all'ora della partita
  const scelto = centro.gruppi.find((g) => g.chiave === gruppo) ?? (perGruppo ? centro.gruppi.find((g) => perGruppo[g.chiave]?.includes(ora)) : undefined)
  const liberoOra = !!(scelto && perGruppo?.[scelto.chiave]?.includes(ora))
  const nomeGruppo = (g: Gruppo) => `${t('Calcio a {n}', { n: g.tipo })} · ${g.coperto ? `🏠 ${t('dentro')}` : `🌤️ ${t('fuori')}`}`
  const prezzo = (g: Gruppo) => Math.round(((g.prezzoOra * Math.ceil(quando.durata / 30) * 30) / 60) * 100) / 100
  const prenota = attiva && !quando.ripeti

  const scegli = (g: Gruppo, o: string) => {
    setGruppo(g.chiave)
    // l'ora della partita diventa quella toccata
    if (o !== ora) window.dispatchEvent(new CustomEvent('imposta-data', { detail: { name: 'data', value: `${giorno}T${o}` } }))
  }

  return (
    <div ref={box} className="space-y-3 rounded-xl border-2 border-orange-400 bg-orange-50 p-3 text-sm dark:bg-orange-950/40">
      <label className="flex items-start gap-2 font-semibold">
        <input type="checkbox" name="prenotaCentro" checked={prenota} disabled={quando.ripeti} onChange={(e) => setAttiva(e.target.checked)} className="mt-0.5" />
        <span>
          🏟️ {t('{centro} è su The Cap: prenota il campo da qui', { centro: centro.nome })}
          <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-300">
            {quando.ripeti
              ? t('Per le partite ricorrenti chiedi direttamente al centro.')
              : centro.modo === 'auto'
                ? t('Il campo viene confermato subito.')
                : t('Il centro conferma la prenotazione: ti arriva una notifica.')}
          </span>
        </span>
      </label>

      {prenota && (
        <>
          <input type="hidden" name="centroId" value={centro.id} />
          {scelto && <input type="hidden" name="gruppoCentro" value={scelto.chiave} />}
          {!giorno ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-300">{t('Scegli il giorno della partita per vedere i campi liberi.')}</p>
          ) : perGruppo === null ? (
            <p className="text-xs text-zinc-500">{t('Cerco gli orari liberi…')}</p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{t('Tocca un orario: scegli il campo e l’ora della partita.')}</p>
              {centro.gruppi.map((g) => {
                const orari = perGruppo[g.chiave] ?? []
                return (
                  <div key={g.chiave} className={`rounded-lg p-2 ${scelto?.chiave === g.chiave ? 'bg-white ring-2 ring-orange-500 dark:bg-zinc-900' : 'bg-white/60 dark:bg-zinc-900/60'}`}>
                    <p className="flex items-center justify-between gap-2 text-xs font-bold">
                      <span>{nomeGruppo(g)}</span>
                      <span className="font-medium text-zinc-500">{t('{euro} € la partita', { euro: prezzo(g) })}</span>
                    </p>
                    {orari.length === 0 ? (
                      <p className="mt-1 text-xs text-zinc-500">{t('Nessun orario libero questo giorno.')}</p>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {orari.map((o) => {
                          const attivo = scelto?.chiave === g.chiave && o === ora
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => scegli(g, o)}
                              className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                                attivo ? 'bg-orange-500 text-white' : 'border border-orange-300 bg-white text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:bg-zinc-900 dark:text-orange-300'
                              }`}
                            >
                              {o}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {scelto && liberoOra ? (
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                  ✅ {t('Prenoti: {campo} alle {ora}', { campo: nomeGruppo(scelto), ora })}
                </p>
              ) : (
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">❌ {t('Alle {ora} non c’è un campo libero: tocca uno degli orari liberi', { ora })}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
