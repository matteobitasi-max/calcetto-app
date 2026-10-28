'use client'

import { useState, useTransition } from 'react'
import { useT } from './lingua'

// Su chi è in lista d'attesa: "⇄ Scambia" apre l'elenco di chi è in lista; scelto uno, i due si scambiano il posto.
export function ScambiaAttesa({ nome, inLista, scambia }: { nome: string; inLista: { key: string; nome: string }[]; scambia: (esce: string) => Promise<void> }) {
  const t = useT()
  const [aperto, setAperto] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        disabled={pending}
        title={t('Scambialo con uno in lista')}
        className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? '…' : `⇄ ${t('Scambia')}`}
      </button>
      {aperto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAperto(false)}>
          <div
            role="dialog"
            aria-label={t('Scambia {nome} con…', { nome })}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl dark:bg-zinc-900"
          >
            <h2 className="font-semibold">⇄ {t('Scambia {nome} con…', { nome })}</h2>
            <p className="mb-3 text-xs text-zinc-500">{t('Chi scegli va in lista d’attesa al suo posto; i posti restano gli stessi.')}</p>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {inLista.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    className="w-full px-1 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setAperto(false)
                      startTransition(() => scambia(p.key))
                    }}
                  >
                    {p.nome}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setAperto(false)} className="mt-2 w-full rounded-lg py-2 text-sm text-zinc-500">
              {t('Annulla')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
