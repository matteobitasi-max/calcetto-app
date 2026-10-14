'use client'

import { useEffect } from 'react'

// Accesso fatto nel browser: torna subito nell'app (con il pulsante se il browser non lo fa da solo).
export function TornaNellApp({ url }: { url: string }) {
  useEffect(() => {
    window.location.href = url
  }, [url])

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-zinc-600 dark:text-zinc-400">Accesso fatto ✅</p>
      <a href={url} className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow hover:bg-green-700">
        Torna nell&apos;app
      </a>
    </div>
  )
}
