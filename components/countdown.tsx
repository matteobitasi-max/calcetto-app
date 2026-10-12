'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function formatta(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const g = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (g > 0) return `${g}g ${h}h ${m}m`
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

// Conto alla rovescia fino a `target`; allo scadere ricarica i dati della pagina.
export function Countdown({ target }: { target: string }) {
  const router = useRouter()
  const end = new Date(target).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= end) {
        clearInterval(t)
        router.refresh()
      }
    }, 1000)
    return () => clearInterval(t)
  }, [end, router])

  return (
    <span className="font-mono font-semibold tabular-nums" suppressHydrationWarning>
      {formatta(end - now)}
    </span>
  )
}
