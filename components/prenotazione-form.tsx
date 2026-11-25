import { ActionForm } from '@/components/action-form'
import { PillSalva } from '@/components/pill-salva'
import { Field, inputClass } from '@/components/ui'
import { DURATE, campiAttivi, type Centro, type Prenotazione } from '@/lib/centro'
import type { FormState } from '@/app/actions'
import { isoToRomeLocal } from '@/lib/dates'

// Il modulo di una prenotazione: campo, giorno e ora, durata, chi prenota, prezzo (vuoto = quello del campo),
// e per una nuova "ripeti ogni settimana" (squadre e gruppi fissi).
export function PrenotazioneForm({
  centro,
  action,
  p,
  iniziale,
}: {
  centro: Centro
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  p?: Prenotazione
  iniziale?: { giorno?: string; campo?: string; ora?: string }
}) {
  const campi = campiAttivi(centro)
  const inizio = p ? isoToRomeLocal(p.inizio) : null
  const durata = p ? Math.round((Date.parse(p.fine) - Date.parse(p.inizio)) / 60_000) : 60
  return (
    <ActionForm action={action} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campo">
          <select name="campo" required defaultValue={p?.campo ?? iniziale?.campo ?? campi[0]?._key} className={inputClass}>
            {campi.map((c) => (
              <option key={c._key} value={c._key}>
                {c.nome} · calcio a {c.tipo} · {c.prezzoOra} €/h
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chi prenota">
          <input name="cliente" required maxLength={80} defaultValue={p?.cliente} placeholder="Es. Squadra di Marco, ASD Esempio…" className={inputClass} />
        </Field>
        <Field label="Giorno">
          <input name="giorno" type="date" required defaultValue={inizio?.slice(0, 10) ?? iniziale?.giorno} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ora">
            <input name="ora" type="time" step={1800} required defaultValue={inizio?.slice(11) ?? iniziale?.ora ?? '20:00'} className={inputClass} />
          </Field>
          <Field label="Durata">
            <select name="durata" defaultValue={String((DURATE as readonly number[]).includes(durata) ? durata : 60)} className={inputClass}>
              {DURATE.map((d) => (
                <option key={d} value={d}>
                  {d === 60 ? '1 ora' : d === 90 ? '1 ora e mezza' : '2 ore'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Telefono (facoltativo)">
          <input name="telefono" type="tel" maxLength={30} defaultValue={p?.telefono} className={inputClass} />
        </Field>
        <Field label="Prezzo € (vuoto = prezzo del campo)">
          <input name="prezzo" inputMode="decimal" defaultValue={p ? String(p.prezzo) : ''} placeholder="automatico" className={inputClass} />
        </Field>
      </div>
      <Field label="Note">
        <textarea name="nota" rows={2} maxLength={300} defaultValue={p?.nota} className={inputClass} />
      </Field>
      {!p && (
        <Field label="Ripeti ogni settimana">
          <select name="settimane" defaultValue="1" className={inputClass}>
            <option value="1">No, solo questa volta</option>
            {[4, 8, 12, 16, 24, 30, 40].map((n) => (
              <option key={n} value={n}>
                Per {n} settimane
              </option>
            ))}
          </select>
        </Field>
      )}
      <PillSalva label={p ? 'Salva modifiche' : 'Prenota'} quando={p ? 'modificato' : 'completo'} />
    </ActionForm>
  )
}
