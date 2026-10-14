import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignOutButton } from '@clerk/nextjs'
import { salvaAccount } from '@/app/actions'
import { PIEDI, RUOLI, getMemberships, getUtente } from '@/lib/player'
import { ActionForm } from '@/components/action-form'
import { EliminaAccount } from '@/components/elimina-account'
import { PillSalva } from '@/components/pill-salva'
import { Card, Field, Loading, buttonClass, inputClass } from '@/components/ui'

// "Il mio account": dati personali (che finiscono in tutte le mie schede giocatore),
// privacy e contatti, uscita ed eliminazione dell'account.
export default function AccountPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Account />
    </Suspense>
  )
}

async function Account() {
  const [utente, leghe] = await Promise.all([getUtente(), getMemberships()])
  if (!utente) redirect('/sign-in')
  // Se non li ho ancora scelti qui, si parte da quelli della mia scheda (es. messi dall'organizzatore).
  const scheda = leghe[0]
  const telefono = utente.telefono ?? scheda?.telefono ?? ''
  const ruolo = utente.ruolo ?? scheda?.ruolo ?? ''
  const piede = utente.piede ?? scheda?.piede ?? ''

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Il mio account</h1>
        <p className="mt-1 text-sm text-zinc-500">Questi dati compaiono nella tua scheda giocatore, in tutte le tue leghe.</p>
      </div>

      <ActionForm action={salvaAccount} className="space-y-4">
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome">
              <input name="nome" required maxLength={40} defaultValue={utente.nome ?? ''} autoComplete="given-name" className={inputClass} />
            </Field>
            <Field label="Cognome">
              <input name="cognome" maxLength={40} defaultValue={utente.cognome ?? ''} autoComplete="family-name" className={inputClass} />
            </Field>
          </div>
          <Field label="Email">
            <input value={utente.emails[0] ?? '—'} readOnly disabled className={`${inputClass} text-zinc-500`} />
          </Field>
          <Field label="Telefono (facoltativo)">
            <input
              name="telefono"
              type="tel"
              inputMode="tel"
              defaultValue={telefono}
              placeholder="333 1234567"
              autoComplete="tel"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ruolo">
              <select name="ruolo" defaultValue={ruolo} className={`${inputClass} capitalize`}>
                <option value="">—</option>
                {RUOLI.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Piede">
              <select name="piede" defaultValue={piede} className={`${inputClass} capitalize`}>
                <option value="">—</option>
                {PIEDI.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
        <PillSalva />
      </ActionForm>

      <Card className="divide-y divide-zinc-100 p-0! text-sm dark:divide-zinc-800">
        <Link href="/privacy" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          🔒 Privacy policy <span className="text-zinc-400">›</span>
        </Link>
        <Link href="/supporto" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          💬 Supporto e contatti <span className="text-zinc-400">›</span>
        </Link>
      </Card>

      <SignOutButton redirectUrl="/sign-in">
        <button className={`${buttonClass('secondary')} w-full`}>Esci</button>
      </SignOutButton>
      <EliminaAccount />

      <Link href={leghe.length ? '/' : '/benvenuto'} className="block text-center text-sm text-green-700 hover:underline dark:text-green-400">
        ← {leghe.length ? 'Torna all’app' : 'Torna alle leghe'}
      </Link>
    </div>
  )
}
