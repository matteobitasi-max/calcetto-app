'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from './lingua'
import { inputClass } from './ui-classes'

type Gruppo = { chiave: string; tipo: number; coperto: boolean; prezzoOra: number; campi: number }
type CentroPubblico = { id: string; nome: string; modo: 'auto' | 'richiesta'; apre: string; chiude: string; gruppi: Gruppo[] }

// Nel modulo di una nuova partita: se il campo scelto dalla mappa è un centro sportivo su The Cap, si può
// prenotare il campo da qui. Si sceglie il tipo (a 5, 7, 11; dentro o fuori) e si vedono gli orari liberi del
// giorno scelto; salvando la partita parte la prenotazione (confermata subito o da confermare dal centro).
// Legge dal modulo il posto scelto ("campo"), la data ("data") e la durata ("durataMinuti").
export function PrenotaCentro() {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  const [posto, setPosto] = useState<string | null>(null)
  const [quando, setQuando] = useState({ data: '', durata: 60, ripeti: false })
  const [centro, setCentro] = useState<CentroPubblico | null>(null)
  const [attiva, setAttiva] = useState(true)
  const [gruppo, setGruppo] = useState('')
  const [orari, setOrari] = useState<{ chiave: string; lista: string[] } | null>(null)

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
      setPosto(placeId)
      setQuando({ data: String(fd.get('data') ?? ''), durata: Number(fd.get('durataMinuti')) || 60, ripeti: fd.get('ripeti') === 'on' })
    }
    const avvio = setTimeout(leggi, 300)
    form.addEventListener('input', leggi)
    form.addEventListener('change', leggi)
    form.addEventListener('click', leggi)
    return () => {
      clearTimeout(avvio)
      form.removeEventListener('input', leggi)
      form.removeEventListener('change', leggi)
      form.removeEventListener('click', leggi)
    }
  }, [])

  // il posto è un centro su The Cap?
  useEffect(() => {
    if (!posto) return
    const ctrl = new AbortController()
    fetch(`/api/centri?${new URLSearchParams({ posto })}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { centro: CentroPubblico | null }) => {
        setCentro(d.centro)
        if (d.centro?.gruppi[0]) setGruppo((g) => (d.centro!.gruppi.some((x) => x.chiave === g) ? g : d.centro!.gruppi[0].chiave))
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [posto])

  const giorno = quando.data.slice(0, 10)
  const chiaveOrari = centro && gruppo && giorno ? `${centro.id}|${gruppo}|${giorno}|${quando.durata}` : ''

  // gli orari liberi del giorno per quel tipo di campo
  useEffect(() => {
    if (!chiaveOrari) return
    const [id, g, d, durata] = chiaveOrari.split('|')
    const ctrl = new AbortController()
    fetch(`/api/centri/liberi?${new URLSearchParams({ centro: id, gruppo: g, giorno: d, durata })}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((x: { orari: string[] }) => setOrari({ chiave: chiaveOrari, lista: x.orari ?? [] }))
      .catch(() => {})
    return () => ctrl.abort()
  }, [chiaveOrari])

  const visibile = !!posto && !!centro && centro.gruppi.length > 0
  const ora = quando.data.slice(11, 16)
  const lista = orari?.chiave === chiaveOrari ? orari.lista : null
  const libera = lista ? lista.includes(ora) : null
  const scelto = centro?.gruppi.find((g) => g.chiave === gruppo)
  const nomeGruppo = (g: Gruppo) => `${t('Calcio a {n}', { n: g.tipo })} · ${g.coperto ? `🏠 ${t('dentro')}` : `🌤️ ${t('fuori')}`} · ${g.prezzoOra} €/h`

  return (
    <div ref={box}>
      {visibile && centro && (
        <div className="space-y-3 rounded-xl border-2 border-orange-400 bg-orange-50 p-3 text-sm dark:bg-orange-950/40">
          <label className="flex items-start gap-2 font-semibold">
            <input type="checkbox" name="prenotaCentro" checked={attiva && !quando.ripeti} disabled={quando.ripeti} onChange={(e) => setAttiva(e.target.checked)} className="mt-0.5" />
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
          {attiva && !quando.ripeti && (
            <>
              <input type="hidden" name="centroId" value={centro.id} />
              <label className="block space-y-1">
                <span className="text-xs font-medium">{t('Tipo di campo')}</span>
                <select name="gruppoCentro" value={gruppo} onChange={(e) => setGruppo(e.target.value)} className={inputClass}>
                  {centro.gruppi.map((g) => (
                    <option key={g.chiave} value={g.chiave}>
                      {nomeGruppo(g)}
                    </option>
                  ))}
                </select>
              </label>
              {!giorno ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{t('Scegli giorno e ora della partita per vedere gli orari liberi.')}</p>
              ) : lista === null ? (
                <p className="text-xs text-zinc-500">{t('Cerco gli orari liberi…')}</p>
              ) : lista.length === 0 ? (
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t('Quel giorno non ci sono campi liberi di questo tipo.')}</p>
              ) : (
                <div className="space-y-1">
                  <p className={`text-xs font-semibold ${libera ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {libera ? `✅ ${t('Alle {ora} c’è un campo libero', { ora })}` : `❌ ${t('Alle {ora} non c’è un campo libero: cambia l’ora della partita', { ora })}`}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {t('Liberi')}: {lista.join(' · ')}
                  </p>
                  {scelto && libera && (
                    <p className="text-xs text-zinc-500">{t('Prezzo indicativo: {euro} € per la durata della partita', { euro: Math.round(((scelto.prezzoOra * Math.ceil(quando.durata / 30) * 30) / 60) * 100) / 100 })}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
