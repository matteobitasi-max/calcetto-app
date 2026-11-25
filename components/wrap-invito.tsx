'use client'

import { useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { useT } from './lingua'
import { conLega } from '@/lib/link-lega'

const chiaveRimando = (chiave: string) => `wrap-dopo:${chiave}`
const leggiRimando = (chiave: string) => {
  try {
    return sessionStorage.getItem(chiaveRimando(chiave)) === '1'
  } catch {
    return false
  }
}

// Il pop-up all'apertura dell'app quando una stagione di cui ho fatto parte è terminata: "Apri il wrap".
// "Più tardi" lo nasconde fino alla prossima apertura dell'app; aperto il wrap non torna più.
export function WrapInvito({ chiave, stagione, lega, legaId }: { chiave: string; stagione: string; lega: string; legaId: string }) {
  const t = useT()
  const rimandato = useSyncExternalStore(
    () => () => {},
    () => leggiRimando(chiave),
    () => true,
  )
  const [chiuso, setChiuso] = useState(false)
  // sulla pagina del wrap il pop-up non serve
  const pagina = usePathname()
  if (rimandato || chiuso || pagina.startsWith('/wrap/')) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="wrap-titolo">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-violet-700 to-indigo-900 p-6 text-center text-white shadow-2xl">
        <p className="text-5xl" aria-hidden>
          🎁
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70">{lega}</p>
        <h2 id="wrap-titolo" className="mt-1 text-2xl font-black leading-tight">
          {t('La stagione {nome} è finita!', { nome: stagione })}
        </h2>
        <p className="mt-2 text-sm text-white/80">{t('Il tuo wrap è pronto: gol, partite, MVP e i momenti migliori della tua stagione.')}</p>
        <a
          href={conLega(`/wrap/${chiave}`, legaId)}
          className="mt-5 block rounded-2xl bg-white px-4 py-3 text-base font-bold text-violet-800 shadow-lg active:scale-[0.98]"
        >
          {t('Apri il wrap')}
        </a>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(chiaveRimando(chiave), '1')
            } catch {}
            setChiuso(true)
          }}
          className="mt-3 text-sm font-medium text-white/70 hover:text-white"
        >
          {t('Più tardi')}
        </button>
      </div>
    </div>
  )
}
