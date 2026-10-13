'use client'

import { useState, useTransition } from 'react'

// Il segno di Satispay: quadratino rosso con la S.
export function IconaSatispay({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#ef4136] font-black text-white"
      style={{ width: size, height: size, fontSize: size * 0.6 }}
      aria-hidden
    >
      S
    </span>
  )
}

// Apre Satispay sul link della lega; al ritorno chiede se il pagamento è andato a buon fine.
export function PagaSatispay({
  link,
  quota,
  segnaPagato,
  variante,
}: {
  link?: string
  quota: number
  segnaPagato: () => Promise<void>
  variante: 'icona' | 'pulsante'
}) {
  const [aperto, setAperto] = useState(false)
  const [pending, startTransition] = useTransition()

  const conferma = (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => segnaPagato())}
      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      {pending ? '…' : aperto ? '✓ Sì, ho pagato' : '✓ Ho pagato'}
    </button>
  )

  if (!link) return conferma

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setAperto(true)}
        title={`Paga ${quota} € con Satispay`}
        className={
          variante === 'icona'
            ? 'rounded-lg ring-offset-2 hover:ring-2 hover:ring-[#ef4136]'
            : 'inline-flex items-center gap-2 rounded-lg bg-[#ef4136] px-3 py-2 text-sm font-medium text-white hover:bg-[#d63a30]'
        }
      >
        {variante === 'icona' ? <IconaSatispay /> : <>💳 Paga {quota} € con Satispay</>}
      </a>
      {(aperto || variante === 'pulsante') && (
        <span className="inline-flex items-center gap-2 text-sm">
          {aperto && <span className="text-zinc-500">Hai pagato?</span>}
          {conferma}
        </span>
      )}
    </span>
  )
}
