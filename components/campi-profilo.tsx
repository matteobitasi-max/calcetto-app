import { PIEDI, RUOLI, type Membro, type getUtente } from '@/lib/player'
import { avatarUrl } from '@/lib/image'
import { getT } from '@/lib/lingua'
import { PhotoInput } from './photo-input'
import { Field } from './ui-base'
import { inputClass } from './ui-classes'

type Utente = NonNullable<Awaited<ReturnType<typeof getUtente>>>

// I dati del mio profilo (pagina "Il mio account" e "Completa il tuo profilo"): finiscono in tutte le mie
// schede giocatore. Se non li ho ancora scelti, si parte da quelli della mia scheda (es. messi dall'organizzatore).
export async function CampiProfilo({ utente, scheda, cognomeObbligatorio = false }: { utente: Utente; scheda?: Membro; cognomeObbligatorio?: boolean }) {
  const t = await getT()
  const telefono = utente.telefono ?? scheda?.telefono ?? ''
  const ruolo = utente.ruolo ?? scheda?.ruolo ?? ''
  const piede = utente.piede ?? scheda?.piede ?? ''
  const dataNascita = utente.dataNascita ?? scheda?.dataNascita ?? ''
  const foto = avatarUrl(scheda?.foto, 160) ?? (utente.fotoAsset ? null : utente.foto)

  return (
    <>
      <PhotoInput currentUrl={foto} />
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('Nome')}>
          <input name="nome" required maxLength={40} defaultValue={utente.nome ?? ''} autoComplete="given-name" className={inputClass} />
        </Field>
        <Field label={t('Cognome')}>
          <input name="cognome" required={cognomeObbligatorio} maxLength={40} defaultValue={utente.cognome ?? ''} autoComplete="family-name" className={inputClass} />
        </Field>
      </div>
      <Field label={t('Telefono (facoltativo)')}>
        <input name="telefono" type="tel" inputMode="tel" defaultValue={telefono} placeholder="333 1234567" autoComplete="tel" className={inputClass} />
      </Field>
      <Field label={t('Data di nascita (facoltativa)')}>
        <input name="dataNascita" type="date" defaultValue={dataNascita} max={new Date().toISOString().slice(0, 10)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('Ruolo')}>
          <select name="ruolo" defaultValue={ruolo} className={`${inputClass} capitalize`}>
            <option value="">—</option>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {t(r)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Piede')}>
          <select name="piede" defaultValue={piede} className={`${inputClass} capitalize`}>
            <option value="">—</option>
            {PIEDI.map((p) => (
              <option key={p} value={p}>
                {t(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </>
  )
}
