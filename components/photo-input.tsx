'use client'

import { useRef, useState } from 'react'
import { shrinkImage } from '@/lib/shrink-image'

export function PhotoInput({ currentUrl }: { currentUrl?: string | null }) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(currentUrl ?? null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-2xl dark:bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) */}
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : '📷'}
      </div>
      <div className="space-y-1 text-sm">
        <input
          ref={input}
          type="file"
          name="foto"
          accept="image/*"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 dark:file:bg-zinc-800"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setBusy(true)
            try {
              const small = await shrinkImage(file)
              const dt = new DataTransfer()
              dt.items.add(small)
              input.current!.files = dt.files
              setPreview(URL.createObjectURL(small))
            } catch {
              setPreview(URL.createObjectURL(file))
            } finally {
              setBusy(false)
            }
          }}
        />
        {busy && <p className="text-zinc-500">Preparo la foto…</p>}
        {currentUrl && (
          <label className="flex items-center gap-2 text-zinc-500">
            <input type="checkbox" name="rimuoviFoto" className="accent-red-600" /> Rimuovi foto attuale
          </label>
        )}
      </div>
    </div>
  )
}
