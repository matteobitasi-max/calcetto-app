import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { creaCentro } from '@/app/centro-actions'
import { getMioCentro } from '@/lib/centro'
import { ricercaCampiAttiva } from '@/lib/google-maps'
import { ActionForm } from '@/components/action-form'
import { CampoInput } from '@/components/campo-input'
import { SubmitButton } from '@/components/submit-button'
import { Field, Loading, inputClass } from '@/components/ui'
import { GruppiCampi } from '@/components/gruppi-campi'

// Primo accesso come centro sportivo: nome, posizione e i campi (quanti, di che tipo, a che prezzo).
// Il resto (nomi dei campi, orari, collaboratori) si sistema dopo nelle impostazioni.
export default function NuovoCentroPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Nuovo />
    </Suspense>
  )
}

async function Nuovo() {
  if (await getMioCentro()) redirect('/centro')
  return (
    <div className="mx-auto max-w-lg space-y-4 py-4">
      <div className="text-center">
        <p className="text-5xl">🏟️</p>
        <h1 className="mt-2 text-2xl font-extrabold">Il tuo centro sportivo su The Cap</h1>
        <p className="mt-1 text-sm text-stone-500">Planning dei campi, prenotazioni, incassi e numeri del centro, dal computer o dal telefono.</p>
      </div>
      <ActionForm action={creaCentro} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <Field label="Nome del centro">
          <input name="nome" required maxLength={60} placeholder="Es. Centro Sportivo Saini" className={inputClass} />
        </Field>
        <Field label="Dove si trova" group>
          <CampoInput ricerca={ricercaCampiAttiva()} placeholder="Cerca il centro sulla mappa…" maxLength={120} />
        </Field>
        <div className="space-y-1 text-sm">
          <span className="font-medium">I campi</span>
          <p className="text-xs text-stone-500">Un gruppo per ogni tipo: per esempio 3 campi a 5 coperti, 2 a 7 all’aperto, 1 a 11. Nomi e prezzi si cambiano poi campo per campo.</p>
        </div>
        <GruppiCampi />
        <SubmitButton className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">Crea il centro</SubmitButton>
      </ActionForm>
    </div>
  )
}
