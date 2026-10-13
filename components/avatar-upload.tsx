'use client'

import { startTransition, useActionState, useState, type ReactNode } from 'react'
import type { FormState } from '@/app/actions'
import { useSceltaFoto } from './scelta-foto'

// Avatar cliccabile: scatta o scegli una foto e viene caricata subito.
export function AvatarUpload({
  action,
  size,
  children,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  size: number
  children: ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [preview, setPreview] = useState<string | null>(null)
  const scelta = useSceltaFoto({
    titolo: 'Foto del profilo',
    onFoto: (foto) => {
      setPreview(URL.createObjectURL(foto))
      const fd = new FormData()
      fd.set('foto', foto)
      startTransition(() => formAction(fd))
    },
  })

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={scelta.apri}
        disabled={pending}
        title="Cambia foto"
        className="group relative block overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) */}
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : children}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/40 text-xl text-white transition ${
            pending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {pending ? '…' : '📷'}
        </span>
      </button>
      <span className="pointer-events-none relative -mt-6 ml-auto block h-6 w-6 rounded-full bg-green-600 text-center text-xs leading-6 text-white ring-2 ring-white dark:ring-zinc-900">
        ✎
      </span>
      {scelta.menu}
      {state?.error && <p className="mt-1 max-w-40 text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
