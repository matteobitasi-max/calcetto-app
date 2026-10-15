'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { eliminaLega, esciDallaLega } from '@/app/actions'

// 🗑️ accanto a una delle mie leghe: esci (la scheda resta, se eri l'unico organizzatore ne diventa
// un altro a caso) oppure, se sei organizzatore, esci ed elimina la lega con tutto quello che contiene.
export function EsciLega({ legaId, nome, organizzatore }: { legaId: string; nome: string; organizzatore: boolean }) {
  const [aperta, setAperta] = useState(false)
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState<string | null>(null)

  const esegui = (azione: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await azione()
        setAperta(false)
      } catch (e) {
        setErrore((e as Error).message || 'Qualcosa è andato storto')
      }
    })

  const voce = 'w-full rounded-xl px-4 py-3 text-left text-sm font-semibold disabled:opacity-50'

  return (
    <>
      <button
        type="button"
        onClick={() => setAperta(true)}
        aria-label={`Esci da ${nome}`}
        className="shrink-0 rounded-lg px-2 py-2 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        🗑️
      </button>
      {aperta &&
        createPortal(
          <div
            role="dialog"
            aria-label={`Esci da ${nome}`}
            onClick={(e) => e.target === e.currentTarget && !pending && setAperta(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          >
            <div className="w-full max-w-sm space-y-2 rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900">
              <p className="px-1 pb-1 text-center font-semibold">{nome}</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirm(`Uscire da "${nome}"?`) && esegui(() => esciDallaLega(legaId))}
                className={`${voce} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700`}
              >
                🚪 Esci dalla lega
                <span className="block text-xs font-normal text-zinc-500">
                  Le tue partite restano nello storico.{organizzatore && ' Se sei l’unico organizzatore, un giocatore a caso prende il tuo posto.'}
                </span>
              </button>
              {organizzatore && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    confirm(`Eliminare "${nome}"? Spariscono per tutti partite, giocatori e classifiche.`) &&
                    confirm('Sicuro? Non si torna indietro.') &&
                    esegui(() => eliminaLega(legaId))
                  }
                  className={`${voce} bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300`}
                >
                  ❌ Esci ed elimina la lega
                  <span className="block text-xs font-normal">Cancella per tutti partite, giocatori e classifiche.</span>
                </button>
              )}
              {errore && <p className="text-center text-sm text-red-600">{errore}</p>}
              <button type="button" disabled={pending} onClick={() => setAperta(false)} className="w-full py-2 text-sm text-zinc-500">
                {pending ? '…' : 'Annulla'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
