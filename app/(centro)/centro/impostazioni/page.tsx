import { Suspense } from 'react'
import { aggiungiChiusura, aggiungiFestivita, aggiungiGestore, salvaCentro, salvaModoApp, togliChiusura } from '@/app/centro-actions'
import { EditorCampi, EditorOrari } from '@/components/editor-centro'
import { settimanaCompleta } from '@/lib/orari-centro'
import { MODI_APP, campiAttivi, oggiRoma, requireCentro } from '@/lib/centro'
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
  const anno = Number(oggiRoma().slice(0, 4))
  // le chiusure di oggi e future (le passate non servono più)
  const prossime = centro.chiusure.filter((c) => c.al >= oggiRoma())
  const data = (d: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
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
        <Field label="Telefono">
          <input name="telefono" type="tel" maxLength={30} defaultValue={centro.telefono} className={inputClass} />
        </Field>
        <PillSalva label="Salva il centro" />
      </ActionForm>

      <section className={riquadro}>
        <h2 className="font-bold">⚽ Campi e prezzi</h2>
        <EditorCampi iniziali={campi.map((c) => ({ key: c._key, nome: c.nome, tipo: c.tipo, coperto: c.coperto, prezzoOra: c.prezzoOra }))} />
      </section>

      <section className={riquadro}>
        <h2 className="font-bold">🕘 Orari di apertura</h2>
        <p className="text-sm text-stone-500">Inizio e fine attività di ogni giorno, e i giorni di chiusura. Il planning e gli orari prenotabili dall’app seguono questi orari.</p>
        <EditorOrari iniziali={settimanaCompleta(centro)} />
      </section>

      <section className={riquadro}>
        <h2 className="font-bold">🎄 Festività e chiusure</h2>
        <p className="text-sm text-stone-500">In questi giorni il centro è chiuso: niente prenotazioni (neanche dall’app) e il planning lo segnala.</p>
        <div className="flex flex-wrap gap-2">
          {[anno, anno + 1].map((a) => (
            <form key={a} action={aggiungiFestivita.bind(null, a)}>
              <SubmitButton className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-semibold hover:bg-stone-100 dark:border-zinc-700 dark:hover:bg-zinc-800">+ Festività italiane {a}</SubmitButton>
            </form>
          ))}
        </div>
        <ActionForm action={aggiungiChiusura} className="grid items-end gap-2 sm:grid-cols-[1fr_9.5rem_9.5rem_auto]">
          <Field label="Motivo">
            <input name="nome" maxLength={60} placeholder="Es. Ferie estive, Torneo…" className={inputClass} />
          </Field>
          <Field label="Dal">
            <input name="dal" type="date" required className={inputClass} />
          </Field>
          <Field label="Al (facoltativo)">
            <input name="al" type="date" className={inputClass} />
          </Field>
          <SubmitButton className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Aggiungi</SubmitButton>
        </ActionForm>
        {prossime.length === 0 ? (
          <p className="text-sm text-stone-500">Nessuna chiusura in programma.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-zinc-800 dark:border-zinc-800">
            {prossime.map((c) => (
              <li key={c._key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{c.nome}</span>
                  <span className="text-stone-500"> · {c.dal === c.al ? data(c.dal) : `${data(c.dal)} – ${data(c.al)}`}</span>
                </span>
                <form action={togliChiusura.bind(null, c._key)}>
                  <SubmitButton className="rounded px-2 text-stone-400 hover:text-red-600" aria-label={`Togli ${c.nome}`}>
                    ✕
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={riquadro}>
        <h2 className="font-bold">📱 Prenotazioni dall’app</h2>
        <p className="text-sm text-stone-500">
          Chi crea una partita su The Cap e sceglie il vostro centro sulla mappa può prenotare il campo da lì: vede solo gli orari liberi e voi trovate la prenotazione nel calendario.
          {!centro.posto && ' Per farvi trovare, scegliete il centro sulla mappa qui sopra.'}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODI_APP.map((m) => (
            <form key={m} action={salvaModoApp.bind(null, m)}>
              <SubmitButton
                className={`w-full rounded-xl border-2 p-3 text-left text-sm ${centro.prenotazioniApp === m ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40' : 'border-stone-200 hover:border-stone-400 dark:border-zinc-700'}`}
              >
                <span className="block font-bold">
                  {centro.prenotazioniApp === m ? '● ' : ''}
                  {m === 'richiesta' ? 'Da confermare' : m === 'auto' ? 'Conferma automatica' : 'Spente'}
                </span>
                <span className="block text-xs text-stone-500">
                  {m === 'richiesta' ? 'Arriva una richiesta, la confermate voi (il campo intanto è tenuto)' : m === 'auto' ? 'Se il campo è libero, è subito prenotato' : 'Dall’app non si prenota: si chiama il centro'}
                </span>
              </SubmitButton>
            </form>
          ))}
        </div>
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
