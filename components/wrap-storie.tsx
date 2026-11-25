'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { segnaWrapVisto } from '@/app/actions'
import type { DatiWrap } from '@/lib/wrap'
import { useT } from './lingua'

type Schermata = { sfondo: string; contenuto: ReactNode }

const DURATA = 7000

// Il wrap come le storie: si tocca a destra per andare avanti, a sinistra per tornare indietro;
// ogni schermata va avanti da sola dopo qualche secondo (tenendo premuto si ferma).
export function WrapStorie({ chiave, dati, logo }: { chiave: string; dati: DatiWrap; logo: string | null }) {
  const t = useT()
  const router = useRouter()
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)

  // aperto: il pop-up non si ripropone più
  useEffect(() => {
    segnaWrapVisto(chiave).catch(() => {})
  }, [chiave])

  const numero = (n: number, cifre = 0) => t.numero(n, { minimumFractionDigits: cifre, maximumFractionDigits: cifre })
  const giorno = (iso: string) => t.data(iso, { weekday: 'long', day: 'numeric', month: 'long' })

  const schermate = useMemo(() => {
    const io = dati.io
    const tot = dati.totali
    const lista: Schermata[] = []
    const grande = (n: string, etichetta: string, sotto?: ReactNode) => (
      <>
        <p className="text-[7rem] font-black leading-none tabular-nums tracking-tight">{n}</p>
        <p className="mt-2 text-2xl font-bold">{etichetta}</p>
        {sotto && <p className="mt-6 text-lg text-white/80">{sotto}</p>}
      </>
    )

    lista.push({
      sfondo: 'from-fuchsia-600 via-violet-700 to-indigo-900',
      contenuto: (
        <>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo già ridimensionato
            <img src={logo} alt="" className="mx-auto h-24 w-24 rounded-3xl object-cover shadow-2xl" />
          ) : (
            <p className="text-7xl">🏆</p>
          )}
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em] text-white/70">{dati.lega.nome}</p>
          <p className="mt-2 text-5xl font-black leading-tight">{dati.stagione}</p>
          <p className="mt-4 text-xl text-white/85">{io ? t('{nome}, ecco la tua stagione.', { nome: dati.nome }) : t('Ecco la stagione della squadra.')}</p>
        </>
      ),
    })

    if (io) {
      if (io.giocate > 0 || io.allenamenti) {
        lista.push({
          sfondo: 'from-emerald-500 via-green-700 to-emerald-950',
          contenuto: grande(
            numero(io.giocate),
            t.n(io.giocate, 'partita giocata', 'partite giocate'),
            io.allenamenti ? t('e {n} allenamenti su {totale}', { n: io.allenamenti.presenze, totale: io.allenamenti.totale }) : undefined,
          ),
        })
      }
      if (io.giocate > 0) {
        lista.push({
          sfondo: 'from-orange-500 via-rose-600 to-red-900',
          contenuto: grande(
            numero(io.gol),
            t.n(io.gol, 'gol segnato', 'gol segnati'),
            io.marcatore === 1 ? `👑 ${t('Capocannoniere della lega!')}` : io.marcatore ? t('{n}° marcatore della lega', { n: io.marcatore }) : t('Il gol non è tutto: la squadra ringrazia.'),
          ),
        })
        const perc = Math.round((io.vinte / io.giocate) * 100)
        lista.push({
          sfondo: 'from-sky-500 via-blue-700 to-indigo-950',
          contenuto: (
            <>
              <p className="text-2xl font-bold">{t('I tuoi risultati')}</p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  [io.vinte, t('vinte'), 'bg-green-500/30'],
                  [io.pari, t('pari'), 'bg-white/15'],
                  [io.perse, t('perse'), 'bg-red-500/30'],
                ].map(([n, l, c]) => (
                  <div key={String(l)} className={`rounded-2xl p-3 ${c}`}>
                    <p className="text-5xl font-black tabular-nums">{numero(Number(n))}</p>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/80">{l}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-xl">{t('Hai vinto il {perc}% delle partite', { perc })}</p>
            </>
          ),
        })
      }
      if (io.mvp > 0) {
        lista.push({ sfondo: 'from-amber-400 via-yellow-600 to-amber-900', contenuto: grande(numero(io.mvp), t.n(io.mvp, 'volta MVP', 'volte MVP'), '🫑') })
      }
      if (io.km) {
        lista.push({ sfondo: 'from-teal-400 via-cyan-700 to-slate-900', contenuto: grande(numero(io.km, 1), t('km corsi'), t('Più o meno {n} giri di campo', { n: numero(Math.round((io.km * 1000) / 300)) })) })
      }
      if (io.pagella) {
        lista.push({
          sfondo: 'from-violet-500 via-purple-700 to-slate-900',
          contenuto: grande(numero(io.pagella.media, 1), t('voto medio in pagella'), t.n(io.pagella.n, 'su {n} pagella', 'su {n} pagelle')),
        })
      }
      if (io.migliore) {
        const m = io.migliore
        lista.push({
          sfondo: 'from-rose-500 via-pink-700 to-purple-950',
          contenuto: (
            <>
              <p className="text-2xl font-bold">{t('La tua partita migliore')}</p>
              <p className="mt-4 text-lg capitalize text-white/80">{giorno(m.data)}</p>
              <p className="mt-4 text-8xl font-black tabular-nums">
                {m.fatti}–{m.subiti}
              </p>
              <p className="mt-6 text-xl">
                {m.gol > 0 ? t.n(m.gol, '{n} gol tuo', '{n} gol tuoi') : m.fatti > m.subiti ? t('Una vittoria da ricordare') : t('Una partita da ricordare')}
                {m.mvp && ` · 🫑 MVP`}
              </p>
            </>
          ),
        })
      }
      if (io.compagno) {
        lista.push({
          sfondo: 'from-lime-500 via-green-700 to-teal-950',
          contenuto: (
            <>
              <p className="text-2xl font-bold">{t('Il tuo compagno di squadra')}</p>
              <p className="mt-8 text-5xl font-black leading-tight">{io.compagno.nome}</p>
              <p className="mt-6 text-xl text-white/85">
                {t('{n} partite insieme, {v} vinte', { n: io.compagno.insieme, v: io.compagno.vinte })}
              </p>
            </>
          ),
        })
      }
      if (io.posizione) {
        lista.push({
          sfondo: 'from-yellow-400 via-orange-600 to-red-950',
          contenuto: grande(
            `${io.posizione.pos}°`,
            t('in classifica su {n}', { n: io.posizione.su }),
            io.posizione.pos === 1 ? `🏆 ${t('Campione della stagione!')}` : t('{punti} punti', { punti: numero(io.posizione.punti) }),
          ),
        })
      }
    }

    // la lega: i numeri di tutti
    const voci: [string, string][] = [
      [numero(tot.partite), t.n(tot.partite, 'partita', 'partite')],
      [numero(tot.gol), t('gol')],
      ...(tot.allenamenti ? [[numero(tot.allenamenti), t.n(tot.allenamenti, 'allenamento', 'allenamenti')] as [string, string]] : []),
      ...(tot.km > 0 ? [[numero(tot.km, 0), t('km corsi')] as [string, string]] : []),
    ]
    const premi: [string, string, string][] = [
      ...(tot.primo ? [['🏆', t('Primo in classifica'), tot.primo.nome] as [string, string, string]] : []),
      ...(tot.capocannoniere ? [['⚽', t('Capocannoniere'), `${tot.capocannoniere.nome} · ${tot.capocannoniere.gol}`] as [string, string, string]] : []),
      ...(tot.reMvp ? [['🫑', t('Re degli MVP'), `${tot.reMvp.nome} · ${tot.reMvp.mvp}`] as [string, string, string]] : []),
      ...(tot.stakanovista ? [['🔁', t('Sempre presente'), `${tot.stakanovista.nome} · ${tot.stakanovista.giocate}`] as [string, string, string]] : []),
    ]
    lista.push({
      sfondo: 'from-slate-700 via-zinc-800 to-black',
      contenuto: (
        <>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">{dati.lega.nome}</p>
          <p className="mt-1 text-2xl font-bold">{t('La stagione in numeri')}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {voci.map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 p-3">
                <p className="text-4xl font-black tabular-nums">{n}</p>
                <p className="text-sm text-white/75">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 text-left">
            {premi.map(([e, l, v]) => (
              <p key={l} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
                <span className="text-2xl">{e}</span>
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-wide text-white/60">{l}</span>
                  <span className="block truncate font-bold">{v}</span>
                </span>
              </p>
            ))}
          </div>
        </>
      ),
    })

    lista.push({
      sfondo: 'from-fuchsia-600 via-violet-700 to-indigo-900',
      contenuto: (
        <>
          <p className="text-7xl">🙌</p>
          <p className="mt-6 text-4xl font-black leading-tight">{t('Grazie per la stagione {nome}!', { nome: dati.stagione })}</p>
          <p className="mt-4 text-xl text-white/85">{t('Ci vediamo in campo.')}</p>
        </>
      ),
    })
    return lista
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dipende solo dai dati del wrap
  }, [dati, logo])

  const ultima = schermate.length - 1
  const esci = useCallback(() => router.push('/'), [router])
  const avanti = useCallback(() => setI((x) => Math.min(x + 1, ultima)), [ultima])
  const indietro = () => setI((x) => Math.max(x - 1, 0))

  // avanti da sola (non sull'ultima schermata)
  useEffect(() => {
    if (pausa || i >= ultima) return
    const via = setTimeout(avanti, DURATA)
    return () => clearTimeout(via)
  }, [i, pausa, ultima, avanti])

  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') avanti()
      if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0))
      if (e.key === 'Escape') esci()
    }
    window.addEventListener('keydown', tasti)
    return () => window.removeEventListener('keydown', tasti)
  }, [avanti, esci])

  const s = schermate[i]
  return (
    <div className={`fixed inset-0 z-[80] flex flex-col bg-gradient-to-br ${s.sfondo} text-white transition-colors duration-500`}>
      {/* barre di avanzamento e chiudi */}
      <div className="mx-auto w-full max-w-md px-3 pt-[max(0.75rem,var(--safe-area-inset-top,env(safe-area-inset-top)))]">
        <div className="flex gap-1">
          {schermate.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                key={`${k}-${i}`}
                className={`h-full bg-white ${k < i ? 'w-full' : k > i ? 'w-0' : i >= ultima ? 'w-full' : 'wrap-barra'}`}
                style={k === i && i < ultima ? { animationDuration: `${DURATA}ms`, animationPlayState: pausa ? 'paused' : 'running' } : undefined}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-semibold text-white/80">
          <span>
            {dati.lega.nome} · {dati.stagione}
          </span>
          <button type="button" onClick={esci} aria-label={t('Chiudi')} className="rounded-full px-2 text-2xl leading-none text-white">
            ✕
          </button>
        </div>
      </div>

      {/* tocco a sinistra: indietro; a destra: avanti; tenendo premuto si ferma */}
      <div
        className="relative mx-auto flex w-full max-w-md flex-1 select-none items-center justify-center px-8 text-center"
        onPointerDown={() => setPausa(true)}
        onPointerUp={() => setPausa(false)}
        onPointerLeave={() => setPausa(false)}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          if (e.clientX - r.left < r.width / 3) indietro()
          else if (i < ultima) avanti()
        }}
      >
        <div key={i} className="wrap-entra w-full">
          {s.contenuto}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-6 pb-[max(1.5rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))]">
        {i >= ultima ? (
          <button type="button" onClick={esci} className="w-full rounded-2xl bg-white py-3 text-base font-bold text-violet-800 shadow-lg">
            {t('Chiudi')}
          </button>
        ) : (
          <p className="text-center text-xs text-white/60">{t('Tocca per andare avanti')}</p>
        )}
      </div>
    </div>
  )
}
