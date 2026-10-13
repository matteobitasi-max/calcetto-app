import Link from 'next/link'
import { Suspense } from 'react'
import { UserButton } from '@clerk/nextjs'
import { creaLega, scegliLega, uniscitiConCodice } from '@/app/actions'
import { getCurrentPlayer, getMemberships, getUtente } from '@/lib/player'
import { ActionForm } from '@/components/action-form'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass, inputClass } from '@/components/ui'

export default function BenvenutoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Benvenuto />
    </Suspense>
  )
}

async function Benvenuto() {
  const [utente, leghe, attiva] = await Promise.all([getUtente(), getMemberships(), getCurrentPlayer()])

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{leghe.length ? 'Le tue leghe' : `Benvenuto${utente?.nome ? `, ${utente.nome}` : ''}! 👋`}</h1>
        {!leghe.length && <p className="mt-1 text-sm text-zinc-500">Crea la lega del tuo gruppo oppure entra con l&apos;invito che ti hanno mandato.</p>}
      </div>

      {leghe.length > 0 && (
        <Card className="space-y-2">
          {leghe.map((m) => (
            <form key={m.lega._id} action={scegliLega.bind(null, m.lega._id, '/')}>
              <SubmitButton className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <span className="font-medium">{m.lega.nome}</span>
                <span className="text-xs text-zinc-500">
                  {m.isAdmin ? 'organizzatore' : 'giocatore'}
                  {attiva?.lega._id === m.lega._id && ' · attiva'}
                </span>
              </SubmitButton>
            </form>
          ))}
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">📨 Ho un invito</h2>
        <p className="text-sm text-zinc-500">Se ti hanno mandato un link, basta aprirlo. Altrimenti scrivi qui il codice di 6 caratteri.</p>
        <ActionForm action={uniscitiConCodice} className="space-y-3">
          <div className="flex gap-2">
            <input
              name="codice"
              required
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ES. K7P2QX"
              className={`${inputClass} font-mono uppercase tracking-widest`}
            />
            <SubmitButton className={buttonClass('primary')} pendingText="…">
              Entra
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">⚽ Crea una lega</h2>
        <p className="text-sm text-zinc-500">Diventi organizzatore: poi inviti gli altri con un link su WhatsApp.</p>
        <ActionForm action={creaLega} className="space-y-3">
          <input name="nome" required minLength={2} maxLength={40} placeholder="Es. Calcetto del giovedì" className={inputClass} />
          <SubmitButton className={`${buttonClass('secondary')} w-full`} pendingText="Creo…">
            Crea la lega
          </SubmitButton>
        </ActionForm>
      </Card>

      <div className="flex items-center justify-between text-sm">
        {leghe.length > 0 ? (
          <Link href="/" className="text-green-700 hover:underline dark:text-green-400">
            ← Torna all&apos;app
          </Link>
        ) : (
          <span />
        )}
        <UserButton />
      </div>
    </div>
  )
}
