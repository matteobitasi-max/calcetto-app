'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Se manca internet mentre si usa l'app, un avviso copre la pagina; quando la connessione
// torna sparisce da solo e la pagina si aggiorna. (Se manca già all'apertura dell'app, la
// pagina è capacitor/www/offline.html.)
export function SenzaConnessione() {
  const router = useRouter()
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const giu = () => setOffline(true)
    const su = () => {
      setOffline(false)
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stato della rete, noto solo nel browser
    setOffline(!navigator.onLine)
    window.addEventListener('offline', giu)
    window.addEventListener('online', su)
    return () => {
      window.removeEventListener('offline', giu)
      window.removeEventListener('online', su)
    }
  }, [router])

  if (!offline) return null
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-white/95 p-6 text-center backdrop-blur-sm dark:bg-zinc-950/95"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statico */}
      <img src="/icon-512.png" alt="" width={80} height={80} className="rounded-[22%] shadow-lg" />
      <p className="text-5xl">📡</p>
      <h1 className="text-2xl font-bold">Nessuna connessione</h1>
      <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
        The Cap ha bisogno di internet. Controlla Wi‑Fi o dati mobili: appena torna la connessione si riparte da qui.
      </p>
      <button
        type="button"
        onClick={() => (navigator.onLine ? (setOffline(false), router.refresh()) : window.location.reload())}
        className="rounded-xl bg-green-600 px-8 py-3 font-semibold text-white shadow hover:bg-green-700"
      >
        Riprova
      </button>
    </div>
  )
}
