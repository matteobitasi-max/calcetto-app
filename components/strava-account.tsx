'use client'

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useTransition } from 'react'
import { collegaStrava, scollegaStrava } from '@/app/actions'

// Strava nel mio account: collega (per prendere i km delle partite) o scollega.
export function StravaAccount({ atleta, collegato }: { atleta?: string; collegato: boolean }) {
  const [pending, startTransition] = useTransition()

  const collega = () =>
    startTransition(async () => {
      const app = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')
      const url = await collegaStrava(app, window.location.pathname)
      if (app) await Browser.open({ url, presentationStyle: 'popover' })
      else window.location.assign(url)
    })

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>
        <span className="font-semibold text-[#fc4c02]">Strava</span>
        <span className="block text-xs text-zinc-500">
          {collegato ? `Collegato${atleta ? ` come ${atleta}` : ''}: i km delle partite si prendono da lì` : 'Collegalo per prendere i km delle partite'}
        </span>
      </span>
      {collegato ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm('Scollegare Strava?') && startTransition(() => scollegaStrava())}
          className="shrink-0 text-xs text-zinc-500 underline disabled:opacity-50"
        >
          Scollega
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={collega}
          className="shrink-0 rounded-lg bg-[#fc4c02] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e34402] disabled:opacity-50"
        >
          Collega
        </button>
      )}
    </div>
  )
}
