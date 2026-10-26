import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaMiaSquadra } from '@/app/actions'
import { displayName, membroDi } from '@/lib/player'
import { getTorneo, iscrizioniAperte } from '@/lib/tornei'
import { avatarUrl } from '@/lib/image'
import { baseUrl } from '@/lib/url'
import { ActionForm } from '@/components/action-form'
import { InvitoLink } from '@/components/invito-link'
import { PillSalva } from '@/components/pill-salva'
import { Card, Field, Loading, inputClass } from '@/components/ui'
import { FotoSquadra } from '../../../squadre-editor'

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
  const me = await membroDi(torneo?.legaId)
  const squadra = torneo?.squadre.find((s) => s._key === chiave)
  if (!torneo || !me || !squadra) notFound()

  const aperte = iscrizioniAperte(torneo)
  const capitano = squadra.capitanoId === me._id
  const puoGestire = !!me.isAdmin || (capitano && aperte)
  const nomeCapitano = squadra.giocatori.find((g) => g._id === squadra.capitanoId)
  const piena = !!torneo.maxGiocatori && squadra.giocatori.length >= torneo.maxGiocatori
  const link = squadra.codiceInvito ? `${await baseUrl()}/invito-squadra/${squadra.codiceInvito}` : null

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
                <Field label="Nome della squadra">
                  <input name="nome" required minLength={2} maxLength={30} defaultValue={squadra.nome} className={inputClass} />
                </Field>
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              🅒 Capitano: <b>{nomeCapitano ? displayName(nomeCapitano) : '—'}</b>
              {capitano && ' (tu)'}
            </p>
          </Card>

          <Card className="space-y-2">
            <h2 className="font-semibold">
              Giocatori ({squadra.giocatori.length}
              {torneo.maxGiocatori ? `/${torneo.maxGiocatori}` : ''})
            </h2>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {squadra.giocatori.map((g) => (
                <li key={g._id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="truncate">
                    {g._id === squadra.capitanoId && '🅒 '}
                    {displayName(g)}
                  </span>
                  {g._id !== squadra.capitanoId && (
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-red-600">
                      <input type="checkbox" name={`rimuovi_${g._id}`} className="accent-red-600" /> Togli
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <PillSalva label="Salva squadra" />
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
          <p className="text-sm text-zinc-500">🅒 Capitano: {nomeCapitano ? displayName(nomeCapitano) : '—'}</p>
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
          <h2 className="font-semibold">💬 Invita nella squadra</h2>
          {!aperte ? (
            <p className="text-sm text-zinc-500">Le iscrizioni sono chiuse: non si possono più invitare giocatori.</p>
          ) : piena ? (
            <p className="text-sm text-zinc-500">La squadra è al completo ({torneo.maxGiocatori} giocatori).</p>
          ) : link ? (
            <>
              <p className="text-sm text-zinc-500">Chi apre il link entra nella lega (se non c&apos;è già) e direttamente in questa squadra.</p>
              <InvitoLink url={link} nomeLega={me.lega.nome} messaggio={`🏆 Gioca con i ${squadra.nome} nel torneo "${torneo.nome}" su The Cap:`} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Il link della squadra arriva al prossimo salvataggio delle squadre da parte dell&apos;organizzatore.</p>
          )}
        </Card>
      )}
    </div>
  )
}
