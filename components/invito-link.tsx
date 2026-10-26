'use client'

import { useState } from 'react'
import { buttonClass } from './ui-classes'

// Link d'invito: copia negli appunti o manda direttamente su WhatsApp.
export function InvitoLink({ url, nomeLega, messaggio }: { url: string; nomeLega: string; messaggio?: string }) {
  const [copiato, setCopiato] = useState(false)
  const testo = `${messaggio ?? `⚽ Entra nella lega "${nomeLega}" su The Cap:`}\n${url}`
  return (
    <div className="space-y-2">
      <div className="truncate rounded-lg bg-zinc-100 px-3 py-2 font-mono text-sm dark:bg-zinc-800">{url}</div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(testo)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass('primary')}
        >
          💬 Manda su WhatsApp
        </a>
        <button
          type="button"
          className={buttonClass('secondary')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setCopiato(true)
              setTimeout(() => setCopiato(false), 2000)
            } catch {
              window.prompt('Copia il link:', url)
            }
          }}
        >
          {copiato ? '✓ Copiato' : '📋 Copia link'}
        </button>
      </div>
    </div>
  )
}

// Copia negli appunti (con riserva per i browser che non lo permettono).
async function copia(testo: string, etichetta: string) {
  try {
    await navigator.clipboard.writeText(testo)
    return true
  } catch {
    window.prompt(`Copia ${etichetta}:`, testo)
    return false
  }
}

// Il codice d'invito: toccandolo si copia.
export function CodiceInvito({ codice }: { codice: string }) {
  const [copiato, setCopiato] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copia(codice, 'il codice')) {
          setCopiato(true)
          setTimeout(() => setCopiato(false), 2000)
        }
      }}
      title="Tocca per copiare"
      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-sm hover:border-green-600 dark:border-zinc-700"
    >
      Codice: <b className="font-mono text-base tracking-widest">{codice}</b>
      <span className={copiato ? 'font-medium text-green-700 dark:text-green-400' : 'text-zinc-500'}>{copiato ? '✓ Copiato' : '📋'}</span>
    </button>
  )
}
