'use client'

import { useTransition } from 'react'
import { useT } from './lingua'

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

// "Paga": con il link Satispay della lega apre Satispay e segna la quota come pagata;
// senza link segna solo la quota come pagata.
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
  const t = useT()
  const [pending, startTransition] = useTransition()
  const paga = () => startTransition(() => segnaPagato())

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={paga}
        title={t('Paga {quota} € con Satispay', { quota })}
        aria-disabled={pending}
        className={
          variante === 'icona'
            ? 'rounded-lg ring-offset-2 hover:ring-2 hover:ring-[#ef4136]'
            : 'inline-flex items-center gap-2 rounded-lg bg-[#ef4136] px-4 py-2 text-sm font-medium text-white hover:bg-[#d63a30]'
        }
      >
        {variante === 'icona' ? <IconaSatispay /> : <>💳 {t('Paga {quota} € con Satispay', { quota })}</>}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={paga}
      disabled={pending}
      title={t('Paga {quota} €', { quota })}
      className={
        variante === 'icona'
          ? 'rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50'
          : 'inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50'
      }
    >
      {pending ? '…' : variante === 'icona' ? t('Paga') : `💶 ${t('Paga {quota} €', { quota })}`}
    </button>
  )
}
