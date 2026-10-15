import Link from 'next/link'
import { Suspense } from 'react'
import { scegliLega, uniscitiConCodice } from '@/app/actions'
import { CreaLega } from '@/components/crea-lega'
import { EsciLega } from '@/components/esci-lega'
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
        <h1 className="text-2xl font-bold">{`Ciao${utente?.nome ? `, ${utente.nome}` : ''}! 👋`}</h1>
        {!leghe.length && <p className="mt-1 text-sm text-zinc-500">Crea la lega del tuo gruppo oppure entra con l&apos;invito che ti hanno mandato.</p>}
      </div>

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
        <CreaLega />
      </Card>

      {/* Le mie leghe: in fondo, chiuse; toccando si aprono */}
      {leghe.length > 0 && (
        <Card className="p-0!">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold [&::-webkit-details-marker]:hidden">
              🏟️ Le tue leghe ({leghe.length})
              <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-1 border-t border-zinc-200 p-2 dark:border-zinc-800">
              {leghe.map((m) => (
                <div key={m.lega._id} className="flex items-center gap-1">
                  <form action={scegliLega.bind(null, m.lega._id, '/')} className="min-w-0 flex-1">
                    <SubmitButton className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <span className="truncate font-medium">{m.lega.nome}</span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {m.isAdmin ? 'organizzatore' : 'giocatore'}
                        {attiva?.lega._id === m.lega._id && ' · attiva'}
                      </span>
                    </SubmitButton>
                  </form>
                  <EsciLega legaId={m.lega._id} nome={m.lega.nome} organizzatore={!!m.isAdmin} />
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}

      {leghe.length > 0 && (
        <Link href="/" className="block text-center text-sm text-green-700 hover:underline dark:text-green-400">
          ← Torna all&apos;app
        </Link>
      )}
    </div>
  )
}
