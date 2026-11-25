import { Suspense } from 'react'
import { aggiungiGestore, salvaCampo, salvaCentro, togliCampo } from '@/app/centro-actions'
import { TIPI_CAMPO, campiAttivi, requireCentro, type CampoCentro } from '@/lib/centro'
import { ricercaCampiAttiva } from '@/lib/google-maps'
import { ActionForm } from '@/components/action-form'
import { CampoInput } from '@/components/campo-input'
import { PillSalva } from '@/components/pill-salva'
import { SubmitButton } from '@/components/submit-button'
import { Field, Loading, inputClass } from '@/components/ui'

// Impostazioni del centro: nome, indirizzo, orari; i campi con tipo e prezzo orario; chi lo gestisce.
export default function ImpostazioniCentroPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Impostazioni />
    </Suspense>
  )
}

const riquadro = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900'

async function Impostazioni() {
  const centro = await requireCentro()
  const campi = campiAttivi(centro)
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-extrabold">Impostazioni</h1>

      <ActionForm action={salvaCentro} className={riquadro}>
        <h2 className="font-bold">🏟️ Il centro</h2>
        <Field label="Nome">
          <input name="nome" required maxLength={60} defaultValue={centro.nome} className={inputClass} />
        </Field>
        <Field label="Indirizzo (dalla mappa)" group>
          <CampoInput defaultLuogo={centro.indirizzo} defaultCampo={centro.posto} ricerca={ricercaCampiAttiva()} placeholder="Cerca il centro sulla mappa…" maxLength={120} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Apre alle">
            <input name="apre" type="time" step={1800} required defaultValue={centro.apre} className={inputClass} />
          </Field>
          <Field label="Chiude alle">
            <input name="chiude" type="time" step={1800} required defaultValue={centro.chiude === '24:00' ? '23:59' : centro.chiude} className={inputClass} />
          </Field>
          <Field label="Telefono">
            <input name="telefono" type="tel" maxLength={30} defaultValue={centro.telefono} className={inputClass} />
          </Field>
        </div>
        <PillSalva label="Salva il centro" />
      </ActionForm>

      <section className={riquadro}>
        <h2 className="font-bold">⚽ Campi e prezzi</h2>
        <p className="text-sm text-stone-500">Il prezzo orario si usa per proporre il prezzo di ogni prenotazione (si può sempre cambiare).</p>
        <div className="space-y-3">
          {campi.map((c) => (
            <ModuloCampo key={c._key} campo={c} />
          ))}
        </div>
        <details className="rounded-xl border border-dashed border-stone-300 p-3 dark:border-zinc-700">
          <summary className="cursor-pointer text-sm font-semibold text-orange-700 dark:text-orange-400">+ Aggiungi un campo</summary>
          <div className="pt-3">
            <ModuloCampo />
          </div>
        </details>
      </section>

      <section className={riquadro}>
        <h2 className="font-bold">👥 Chi gestisce il centro</h2>
        <p className="text-sm text-stone-500">
          {centro.gestori.length === 1 ? 'Per ora solo tu.' : `${centro.gestori.length} persone.`} Aggiungi un collaboratore con la sua email: deve aver già fatto l’accesso a The Cap.
        </p>
        <ActionForm action={aggiungiGestore} className="flex flex-wrap gap-2">
          <input name="email" type="email" required placeholder="email@esempio.it" className={`${inputClass} min-w-0 flex-1`} />
          <SubmitButton className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Aggiungi</SubmitButton>
        </ActionForm>
      </section>
    </div>
  )
}

function ModuloCampo({ campo }: { campo?: CampoCentro }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3 dark:bg-zinc-950">
      <ActionForm action={salvaCampo.bind(null, campo?._key ?? null)} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_7rem_auto]">
        <Field label="Nome">
          <input name="nome" required maxLength={40} defaultValue={campo?.nome} placeholder="Es. Campo 3 (sintetico)" className={inputClass} />
        </Field>
        <Field label="Tipo">
          <select name="tipo" defaultValue={String(campo?.tipo ?? 5)} className={inputClass}>
            {TIPI_CAMPO.map((t) => (
              <option key={t} value={t}>
                Calcio a {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="€ all’ora">
          <input name="prezzoOra" inputMode="decimal" required defaultValue={campo ? String(campo.prezzoOra) : ''} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="coperto" defaultChecked={campo?.coperto} /> Coperto
        </label>
        <div className="sm:col-span-4">
          <PillSalva label={campo ? `Salva ${campo.nome}` : 'Aggiungi il campo'} quando={campo ? 'modificato' : 'completo'} />
        </div>
      </ActionForm>
      {campo && (
        <form action={togliCampo.bind(null, campo._key)} className="mt-1 text-right">
          <SubmitButton className="text-xs text-red-600 hover:underline" confirm={`Togliere ${campo.nome} dal planning? Le prenotazioni passate restano nei conti.`}>
            Togli campo
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
