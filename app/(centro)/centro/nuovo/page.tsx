import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { creaCentro } from '@/app/centro-actions'
import { TIPI_CAMPO, getMioCentro } from '@/lib/centro'
import { ricercaCampiAttiva } from '@/lib/google-maps'
import { ActionForm } from '@/components/action-form'
import { CampoInput } from '@/components/campo-input'
import { SubmitButton } from '@/components/submit-button'
import { Field, Loading, inputClass } from '@/components/ui'

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
        <div className="grid grid-cols-3 gap-3">
          <Field label="Quanti campi">
            <input name="campi" type="number" min={1} max={20} required defaultValue={3} className={inputClass} />
          </Field>
          <Field label="Tipo">
            <select name="tipo" defaultValue="5" className={inputClass}>
              {TIPI_CAMPO.map((t) => (
                <option key={t} value={t}>
                  Calcio a {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="€ all’ora">
            <input name="prezzo" inputMode="decimal" required defaultValue="70" className={inputClass} />
          </Field>
        </div>
        <p className="text-xs text-stone-500">Nomi, tipi e prezzi diversi per ogni campo si cambiano dopo, nelle impostazioni.</p>
        <SubmitButton className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">Crea il centro</SubmitButton>
      </ActionForm>
    </div>
  )
}
