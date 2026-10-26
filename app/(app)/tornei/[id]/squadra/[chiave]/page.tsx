import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { creaLinkSquadra, salvaMiaSquadra } from '@/app/actions'
import { displayName, membroDi } from '@/lib/player'
import { getPlayers } from '@/lib/matches'
import { getTorneo, iscrizioniAperte } from '@/lib/tornei'
import { avatarUrl } from '@/lib/image'
import { baseUrl } from '@/lib/url'
import { ActionForm } from '@/components/action-form'
import { InvitoLink } from '@/components/invito-link'
import { PillSalva } from '@/components/pill-salva'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, Loading, buttonClass, inputClass } from '@/components/ui'
import { FotoSquadra } from '../../../squadre-editor'
import { getT } from '@/lib/lingua'

// La squadra di un torneo: il capitano (e gli organizzatori) invita i compagni, cambia nome e foto, toglie giocatori.
export default function SquadraPage({ params }: PageProps<'/tornei/[id]/squadra/[chiave]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Squadra params={params} />
    </Suspense>
  )
}

async function Squadra({ params }: { params: Promise<{ id: string; chiave: string }> }) {
  const { id, chiave } = await params
  const torneo = await getTorneo(id)
  const [me, t] = await Promise.all([membroDi(torneo?.legaId), getT()])
  const squadra = torneo?.squadre.find((s) => s._key === chiave)
  if (!torneo || !me || !squadra) notFound()

  const aperte = iscrizioniAperte(torneo)
  const capitano = squadra.capitanoId === me._id
  const puoGestire = !!me.isAdmin || (capitano && aperte)
  const nomeCapitano = squadra.giocatori.find((g) => g._id === squadra.capitanoId)
  const piena = !!torneo.maxGiocatori && squadra.giocatori.length >= torneo.maxGiocatori
  const link = squadra.codiceInvito ? `${await baseUrl()}/invito-squadra/${squadra.codiceInvito}` : null

  // Chi si può inserire dalla rosa: il capitano solo chi non è in nessuna squadra; l'organizzatore anche chi è
  // in un'altra squadra (tranne i capitani), che verrà spostato qui.
  const squadraDi = new Map(torneo.squadre.flatMap((s) => s.giocatori.map((g) => [g._id, s] as const)))
  const inseribili = puoGestire
    ? (await getPlayers(torneo.legaId)).filter((p) => {
        if (p.attivo === false) return false
        const altra = squadraDi.get(p._id)
        if (altra?._key === squadra._key) return false
        if (!altra) return true
        return !!me.isAdmin && altra.capitanoId !== p._id
      })
    : []

  return (
    <div className="space-y-4 pb-20">
      <Link href={`/tornei/${torneo._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
        ← {torneo.nome}
      </Link>

      {puoGestire ? (
        <ActionForm action={salvaMiaSquadra.bind(null, torneo._id, squadra._key)} className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <FotoSquadra name="foto" attuale={avatarUrl(squadra.logo, 96)} colore={squadra.colore ?? '#16a34a'} nome={squadra.nome} />
              <div className="min-w-0 flex-1">
                <Field label={t('Nome della squadra')}>
                  <input name="nome" required minLength={2} maxLength={30} defaultValue={squadra.nome} className={inputClass} />
                </Field>
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              🅐 {t('Capitano:')} <b>{nomeCapitano ? displayName(nomeCapitano) : '—'}</b>
              {capitano && ` ${t('(tu)')}`}
            </p>
          </Card>

          <Card className="space-y-2">
            <h2 className="font-semibold">
              {t('Giocatori')} ({squadra.giocatori.length}
              {torneo.maxGiocatori ? `/${torneo.maxGiocatori}` : ''})
            </h2>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {squadra.giocatori.map((g) => (
                <li key={g._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="truncate">
                    {g._id === squadra.capitanoId && '🅐 '}
                    {displayName(g)}
                  </span>
                  {g._id !== squadra.capitanoId && (
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-red-600">
                      <input type="checkbox" name={`rimuovi_${g._id}`} className="accent-red-600" /> {t('Togli')}
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {inseribili.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">➕ {t('Inserisci giocatori')}</h2>
              <p className="text-xs text-zinc-500">
                {me.isAdmin
                  ? t('Dalla rosa della lega: chi è in un’altra squadra viene spostato qui.')
                  : t('Dalla rosa della lega (solo chi non è già in una squadra).')}
              </p>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {inseribili.map((p) => {
                  const altra = squadraDi.get(p._id)
                  return (
                    <li key={p._id}>
                      <label className="flex items-center justify-between gap-2 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          {displayName(p)}
                          {altra && <span className="text-xs text-zinc-500"> · {t('nei {squadra}', { squadra: altra.nome })}</span>}
                        </span>
                        <input type="checkbox" name={`aggiungi_${p._id}`} className="h-5 w-5 shrink-0 accent-green-600" />
                      </label>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
          <PillSalva label={t('Salva squadra')} />
        </ActionForm>
      ) : (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            {avatarUrl(squadra.logo, 96) ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
              <img src={avatarUrl(squadra.logo, 96)!} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="h-6 w-6 rounded-full" style={{ background: squadra.colore }} />
            )}
            <h1 className="text-xl font-bold">{squadra.nome}</h1>
          </div>
          <p className="text-sm text-zinc-500">🅐 {t('Capitano:')} {nomeCapitano ? displayName(nomeCapitano) : '—'}</p>
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {squadra.giocatori.map((g) => (
              <li key={g._id} className="py-2">
                {displayName(g)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(capitano || me.isAdmin) && (
        <Card className="space-y-2">
          <h2 className="font-semibold">💬 {t('Invita nella squadra')}</h2>
          {!aperte ? (
            <p className="text-sm text-zinc-500">{t('Le iscrizioni sono chiuse: non si possono più invitare giocatori.')}</p>
          ) : piena ? (
            <p className="text-sm text-zinc-500">{t('La squadra è al completo ({n} giocatori).', { n: torneo.maxGiocatori ?? 0 })}</p>
          ) : link ? (
            <>
              <p className="text-sm text-zinc-500">{t('Chi apre il link entra nella lega (se non c’è già) e direttamente in questa squadra.')}</p>
              <InvitoLink
                url={link}
                nomeLega={me.lega.nome}
                messaggio={`🏆 ${t('Gioca con i {squadra} nel torneo “{torneo}” su The Cap:', { squadra: squadra.nome, torneo: torneo.nome })}`}
              />
            </>
          ) : (
            <form action={creaLinkSquadra.bind(null, torneo._id, squadra._key)}>
              <SubmitButton className={buttonClass('primary')} pendingText={t('Creo…')}>
                🔗 {t('Crea link d’invito')}
              </SubmitButton>
            </form>
          )}
        </Card>
      )}
    </div>
  )
}
