'use client'

import { useState } from 'react'
import { buttonClass } from './ui-classes'

// Link d'invito: copia negli appunti o manda direttamente su WhatsApp.
export function InvitoLink({ url, nomeLega }: { url: string; nomeLega: string }) {
  const [copiato, setCopiato] = useState(false)
  const testo = `⚽ Entra nella lega "${nomeLega}" su Calcetto:\n${url}`
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
