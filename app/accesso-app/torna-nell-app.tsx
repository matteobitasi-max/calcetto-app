'use client'

import { useEffect } from 'react'
import { useT } from '@/components/lingua'

// Accesso fatto nel browser: torna subito nell'app (con il pulsante se il browser non lo fa da solo).
export function TornaNellApp({ url }: { url: string }) {
  const t = useT()
  useEffect(() => {
    window.location.href = url
  }, [url])

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-zinc-600 dark:text-zinc-400">{t('Accesso fatto')} ✅</p>
      <a href={url} className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow hover:bg-green-700">
        {t('Torna nell’app')}
      </a>
    </div>
  )
}
