import Link from 'next/link'
import { VaiA } from '@/components/vai-a'
import { RiprendiInvito } from '@/components/invito-app'
import { Suspense } from 'react'
import { scegliLega, uniscitiConCodice } from '@/app/actions'
import { CreaLega } from '@/components/crea-lega'
import { EsciLega } from '@/components/esci-lega'
import { getCurrentPlayer, getMemberships, getUtente, isTitolare } from '@/lib/player'
import { ActionForm } from '@/components/action-form'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass, inputClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

export default function BenvenutoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Benvenuto />
    </Suspense>
  )
}

async function Benvenuto() {
  const [utente, leghe, attiva, titolare, t] = await Promise.all([getUtente(), getMemberships(), getCurrentPlayer(), isTitolare(), getT()])
  if (utente?.daCompletare) return <VaiA href={'/completa-profilo?dopo=/benvenuto'} />

  return (
    <div className="space-y-4">
      <RiprendiInvito />
      <div className="text-center">
        <h1 className="text-2xl font-bold">{utente?.nome ? t('Ciao, {nome}! 👋', { nome: utente.nome }) : t('Ciao! 👋')}</h1>
        {!leghe.length && <p className="mt-1 text-sm text-zinc-500">{t('Crea la lega del tuo gruppo oppure entra con l’invito che ti hanno mandato.')}</p>}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">📨 {t('Ho un invito')}</h2>
        <p className="text-sm text-zinc-500">{t('Se ti hanno mandato un link, basta aprirlo. Altrimenti scrivi qui il codice di 6 caratteri.')}</p>
        <ActionForm action={uniscitiConCodice} className="space-y-3">
          <div className="flex gap-2">
            <input
              name="codice"
              required
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder={t('ES. K7P2QX')}
              className={`${inputClass} font-mono uppercase tracking-widest`}
            />
            <SubmitButton className={buttonClass('primary')} pendingText="…">
              {t('Entra')}
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {/* Il titolare dell'app può aggiungersi a qualsiasi lega, anche senza invito */}
      {titolare && (
        <Card className="space-y-3">
          <h2 className="font-semibold">👑 {t('Aggiungiti a una lega esistente')}</h2>
          <p className="text-sm text-zinc-500">{t('Scegli tra tutte le leghe dell’app ed entra nella rosa come giocatore e organizzatore.')}</p>
          <Link href="/leghe" className={`${buttonClass('secondary')} w-full justify-center`}>
            {t('Vedi tutte le leghe →')}
          </Link>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">⚽ {t('Crea una lega')}</h2>
        <p className="text-sm text-zinc-500">{t('Diventi organizzatore: poi inviti gli altri con un link su WhatsApp.')}</p>
        <CreaLega />
      </Card>

      {/* Le mie leghe: in fondo, chiuse; toccando si aprono */}
      {leghe.length > 0 && (
        <Card className="p-0!">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold [&::-webkit-details-marker]:hidden">
              🏟️ {t('Le tue leghe ({n})', { n: leghe.length })}
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
                        {m.isAdmin ? t('organizzatore') : t('giocatore')}
                        {attiva?.lega._id === m.lega._id && ` · ${t('attiva')}`}
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
          ← {t('Torna all’app')}
        </Link>
      )}
    </div>
  )
}
