'use client'

import { useActionState, useState } from 'react'
import { inviaComunicazione, type AvvisoState } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'
import { useT } from '@/components/lingua'

// "Scrivi alla squadra": il capitano (o un organizzatore) manda una comunicazione a tutti.
export function ScriviSquadra() {
  const t = useT()
  const [testo, setTesto] = useState('')
  const [inviato, setInviato] = useState('')
  const [state, invia, pending] = useActionState(async (prev: AvvisoState, fd: FormData) => {
    const r = await inviaComunicazione(prev, fd)
    if (!r?.error) {
      setInviato(String(fd.get('testo') ?? '').trim())
      setTesto('')
    }
    return r
  }, undefined)
  const whatsapp = (msg: string) => `https://wa.me/?text=${encodeURIComponent(`📢 ${msg}`)}`

  return (
    <details className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        📢 {t('Scrivi alla squadra')}
        <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <form action={invia} className="space-y-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
        <textarea
          name="testo"
          rows={3}
          maxLength={300}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={t('Es. Ricordate le pettorine 💪')}
          className={inputClass}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-400">{testo.length}/300</span>
          <span className="flex gap-2">
            {/* WhatsApp non permette di scrivere da soli in un gruppo: si apre con il testo pronto e si sceglie il gruppo */}
            <a
              href={whatsapp(testo.trim())}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={testo.trim().length < 2}
              className={`${buttonClass('secondary')} text-green-700 dark:text-green-400 ${testo.trim().length < 2 ? 'pointer-events-none opacity-50' : ''}`}
            >
              💬 {t('Anche su WhatsApp')}
            </a>
            <button type="submit" disabled={pending || testo.trim().length < 2} className={buttonClass('primary')}>
              {pending ? t('Invio…') : t('Invia a tutti')}
            </button>
          </span>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state && !state.error && (
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓{' '}
            {state.totali
              ? t.n(state.inviate ?? 0, 'Inviata su {n} dispositivo.', 'Inviata su {n} dispositivi.')
              : `${t('Inviata.')} ${t('Nessuno ha le notifiche attive per le comunicazioni.')}`}{' '}
            {inviato && (
              <a href={whatsapp(inviato)} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                💬 {t('Mandalo anche su WhatsApp')}
              </a>
            )}
          </p>
        )}
      </form>
    </details>
  )
}
