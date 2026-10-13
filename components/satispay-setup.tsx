'use client'

import jsQR from 'jsqr'
import { useState } from 'react'
import { inputClass } from './ui-classes'

// Legge il contenuto di un QR da un'immagine (es. lo screenshot del QR Satispay).
async function leggiQr(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  const scala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scala)
  canvas.height = Math.round(bitmap.height * scala)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null
}

const isLink = (s: string) => {
  try {
    return new URL(s).protocol === 'https:'
  } catch {
    return false
  }
}

// Link Satispay dell'organizzatore: si incolla, oppure si ricava dallo screenshot del QR.
export function SatispaySetup({ link: linkIniziale, qrUrl }: { link?: string; qrUrl?: string | null }) {
  const [link, setLink] = useState(linkIniziale ?? '')
  const [anteprima, setAnteprima] = useState(qrUrl ?? null)
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string }>()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-3xl dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale o dal CDN di Sanity */}
          {anteprima ? <img src={anteprima} alt="QR Satispay" className="h-full w-full object-contain" /> : '▦'}
        </div>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Screenshot del tuo QR Satispay</span>
          <input
            type="file"
            name="satispayQr"
            accept="image/*"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 dark:file:bg-zinc-800"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setAnteprima(URL.createObjectURL(file))
              const letto = await leggiQr(file).catch(() => null)
              if (letto && isLink(letto)) {
                setLink(letto)
                setMessaggio({ ok: true, testo: 'Link letto dal QR ✓' })
              } else if (letto) {
                setMessaggio({ ok: false, testo: `Il QR non contiene un link (contiene: "${letto.slice(0, 40)}"). Resterà da mostrare al campo.` })
              } else {
                setMessaggio({ ok: false, testo: 'Non riesco a leggere il QR: prova con uno screenshot più nitido, o incolla il link qui sotto.' })
              }
            }}
          />
          {anteprima && qrUrl && (
            <span className="flex items-center gap-2 text-zinc-500">
              <input type="checkbox" name="rimuoviQr" className="accent-red-600" /> Rimuovi QR
            </span>
          )}
        </label>
      </div>
      {messaggio && <p className={`text-sm ${messaggio.ok ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>{messaggio.testo}</p>}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Link di pagamento</span>
        <input
          name="satispayLink"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={inputClass}
        />
        <span className="block text-xs text-zinc-500">I giocatori lo apriranno con &quot;Paga con Satispay&quot;.</span>
      </label>
    </div>
  )
}
