import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { canEnterResults, displayName, requirePlayer, overall, type Player } from '@/lib/player'
import { finestra, getMatch, getPlayers, ordinati, presenti, risultatoDa, type Match, type Risposta } from '@/lib/matches'
import { formatData } from '@/lib/dates'
import { aggiungiDaAttesa, apriConvocazioni, cambiaStato, rimettiInAttesa, eliminaPartita, generaSquadre, spostaGiocatore } from '@/app/actions'
import { Countdown } from '@/components/countdown'
import { ApriConvocazioni } from '@/components/apri-convocazioni'
import { baseUrl } from '@/lib/url'
import { SubmitButton } from '@/components/submit-button'
import { ButtonLink, Card, Loading, PlayerRow, StatoBadge, buttonClass } from '@/components/ui'
import { FinestraInfo } from '../finestra-info'
import { RispostaButtons } from '../risposta-buttons'

export default function MatchPage({ params }: PageProps<'/partite/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <MatchDetail params={params} />
    </Suspense>
  )
}

async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, player] = await Promise.all([params, requirePlayer()])
  const [match, rosa] = await Promise.all([getMatch(id), getPlayers()])
  if (!match) notFound()

  const count = presenti(match).length
  const aggiunti = presenti(match).filter((c) => c.aggiunto).length
  const gestisci = !!player.isAdmin && match.stato !== 'giocata' && match.stato !== 'annullata'
  const risposto = new Set(match.convocazioni.map((c) => c.giocatore?._id))
  const mancanti = finestra(match) === 'aperta' ? rosa.filter((p) => p.attivo !== false && !risposto.has(p._id)) : []

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold capitalize">{formatData(match.data)}</h1>
          <StatoBadge stato={match.stato} />
        </div>
        <p className="text-sm text-zinc-500">
          📍 {match.luogo}
          {match.quota != null && ` · ${match.quota} € a testa`}
        </p>
        {match.note && <p className="whitespace-pre-line text-sm">{match.note}</p>}
        <FinestraInfo match={match} />
        {match.serieId && (
          <p className="text-sm text-zinc-500">
            🔁 Partita ricorrente
            {player.isAdmin && (
              <>
                {' · '}
                <Link href={`/partite/ricorrenti/${match.serieId}`} className="text-green-700 hover:underline dark:text-green-400">
                  modifica la serie
                </Link>
              </>
            )}
          </p>
        )}
        {match.stato === 'giocata' && match.risultato?.golA != null && <Tabellino match={match} />}
        {canEnterResults(player) && <RisultatoAzione match={match} />}
        <div className="border-t border-zinc-200 pt-3 empty:hidden dark:border-zinc-800">
          <RispostaButtons match={match} playerId={player._id} />
        </div>
      </Card>

      {player.isAdmin && <AdminPanel match={match} whatsappUrl={await whatsappUrl(match)} />}

      {match.squadraA.length + match.squadraB.length > 0 && (
        <Squadre match={match} canEdit={!!player.isAdmin && match.stato === 'chiusa' && new Date() < risultatoDa(match)} />
      )}

      <Card>
        <h2 className="mb-3 font-semibold">
          Convocati <span className="font-normal text-zinc-500">· {count}/{match.postiDisponibili}</span>
          {aggiunti > 0 && (
            <span className="ml-1 text-xs font-normal text-zinc-500">
              ({match.postiDisponibili - aggiunti} + {aggiunti} aggiunt{aggiunti === 1 ? 'o' : 'i'})
            </span>
          )}
        </h2>
        <Gruppo titolo="In lista" match={match} risposta="presente" numerati gestisci={gestisci} />
        <Gruppo titolo="Lista d'attesa" match={match} risposta="riserva" numerati gestisci={gestisci} />
        <Gruppo titolo="Non ci sono" match={match} risposta="assente" />
        {mancanti.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Non hanno ancora risposto ({mancanti.length})
            </h3>
            <ul className="space-y-2 opacity-60">
              {mancanti.map((p) => (
                <li key={p._id}>
                  <PlayerRow player={p} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {match.convocazioni.length === 0 && mancanti.length === 0 && <p className="text-sm text-zinc-500">Nessuna risposta.</p>}
      </Card>
    </div>
  )
}

function Gruppo({
  titolo,
  match,
  risposta,
  numerati,
  gestisci,
}: {
  titolo: string
  match: Match
  risposta: Risposta
  numerati?: boolean
  /** L'organizzatore può spostare persone tra lista e lista d'attesa. */
  gestisci?: boolean
}) {
  const items = ordinati(match, risposta)
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {titolo} ({items.length})
      </h3>
      <ul className="space-y-2">
        {items.map((c, i) => (
          <li key={c._key} className="flex items-center gap-2">
            {numerati && <span className="w-5 text-right text-xs tabular-nums text-zinc-400">{i + 1}</span>}
            <div className="min-w-0 flex-1">
              <PlayerRow
                player={c.giocatore}
                right={
                  <>
                    {c.aggiunto && risposta === 'presente' && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">aggiunto</span>
                    )}
                    {gestisci && risposta === 'riserva' && (
                      <form action={aggiungiDaAttesa.bind(null, match._id, c._key)}>
                        <SubmitButton className={`${buttonClass('secondary')} px-2 py-1 text-xs`} title="Mettilo in lista: i partecipanti salgono di uno">
                          ➕ Aggiungi
                        </SubmitButton>
                      </form>
                    )}
                    {gestisci && risposta === 'presente' && c.aggiunto && (
                      <form action={rimettiInAttesa.bind(null, match._id, c._key)}>
                        <SubmitButton className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Rimettilo in lista d'attesa">
                          ↩ In attesa
                        </SubmitButton>
                      </form>
                    )}
                  </>
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Squadre({ match, canEdit }: { match: Match; canEdit: boolean }) {
  const teams: [string, Player[], string][] = [
    ['Squadra A', match.squadraA, 'border-t-blue-500'],
    ['Squadra B', match.squadraB, 'border-t-orange-500'],
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teams.map(([nome, players, color]) => {
        const forza = players.reduce((s, p) => s + overall(p), 0)
        return (
          <Card key={nome} className={`border-t-4 ${color}`}>
            <h2 className="mb-3 flex justify-between font-semibold">
              {nome}
              <span className="text-sm font-normal text-zinc-500">forza {forza.toFixed(1)}</span>
            </h2>
            <ul className="space-y-2">
              {players.map((p) => (
                <li key={p._id}>
                  <PlayerRow
                    player={p}
                    right={
                      canEdit ? (
                        <form action={spostaGiocatore.bind(null, match._id, p._id)}>
                          <SubmitButton
                            className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Sposta nell'altra squadra"
                          >
                            ⇄
                          </SubmitButton>
                        </form>
                      ) : (
                        <Prestazione match={match} playerId={p._id} />
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

async function whatsappUrl(match: Match) {
  const breve = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' } as const
  const testo = [
    '⚽ *Convocazioni aperte!*',
    `📅 ${formatData(match.data, breve)}`,
    `📍 ${match.luogo}`,
    `👥 ${match.postiDisponibili} posti${match.quota != null ? ` · ${match.quota} €` : ''}`,
    `⏳ Rispondi entro ${formatData(match.chiusuraConvocazioni, breve)}`,
    '',
    `👉 ${await baseUrl()}/partite/${match._id}`,
  ].join('\n')
  return `https://wa.me/?text=${encodeURIComponent(testo)}`
}

function AdminPanel({ match, whatsappUrl }: { match: Match; whatsappUrl: string }) {
  const count = presenti(match).length
  const fin = finestra(match)
  const scaduta = fin === 'scaduta'
  const statoForm = (stato: Match['stato'], label: string, variant: 'primary' | 'secondary' | 'danger', confirm?: string) => (
    <form action={cambiaStato.bind(null, match._id, stato)}>
      <SubmitButton className={buttonClass(variant)} confirm={confirm}>
        {label}
      </SubmitButton>
    </form>
  )

  return (
    <Card className="space-y-4 border-dashed">
      <h2 className="font-semibold">Gestione organizzatore</h2>

      {(fin === 'non_ancora' || fin === 'aperta') && (
        <div className="space-y-2">
          <ApriConvocazioni
            action={apriConvocazioni.bind(null, match._id)}
            label={fin === 'non_ancora' ? '📣 Apri convocazioni' : '🔔 Avvisa di nuovo'}
            conferma={fin === 'non_ancora' ? 'Aprire adesso le convocazioni e avvisare tutti?' : 'Mandare di nuovo la notifica a tutti?'}
            whatsappUrl={whatsappUrl}
          />
          {match.notificaInviataIl && (
            <p className="text-xs text-zinc-500">
              Giocatori avvisati {formatData(match.notificaInviataIl, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {match.stato === 'aperta' && (
        <div className="space-y-2">
          {scaduta && <p className="text-sm text-amber-700 dark:text-amber-400">Il tempo per convocarsi è finito: chiudi le convocazioni per fare le squadre.</p>}
          <div className="flex flex-wrap gap-2">
            {statoForm('chiusa', '🔒 Chiudi convocazioni', scaduta ? 'primary' : 'secondary', scaduta ? undefined : 'Chiudere le convocazioni prima della scadenza?')}
            <ButtonLink href={`/partite/${match._id}/modifica`} variant="secondary">
              Modifica
            </ButtonLink>
          </div>
        </div>
      )}

      {match.stato === 'chiusa' && (
        <>
          <div className="flex flex-wrap gap-2">
            <form action={generaSquadre.bind(null, match._id)}>
              <SubmitButton className={buttonClass('primary')} disabled={count < 2} pendingText="Sto bilanciando…">
                ⚖️ {match.squadraA.length ? 'Rigenera squadre' : 'Fai le squadre'}
              </SubmitButton>
            </form>
            {statoForm('aperta', 'Riapri convocazioni', 'secondary')}
          </div>
        </>
      )}


      <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {match.stato === 'annullata'
          ? statoForm('aperta', 'Ripristina partita', 'secondary')
          : match.stato !== 'giocata' && statoForm('annullata', 'Annulla partita', 'danger', 'Annullare la partita?')}
        <form action={eliminaPartita.bind(null, match._id)}>
          <SubmitButton className={buttonClass('danger')} confirm={
              match.serieId
                ? 'Eliminare questa partita? Le altre della serie restano e questa data non verrà ricreata.'
                : 'Eliminare definitivamente la partita?'
            }>
            Elimina
          </SubmitButton>
        </form>
      </div>
    </Card>
  )
}

// Gol e MVP del giocatore in questa partita.
function Prestazione({ match, playerId }: { match: Match; playerId: string }) {
  const gol = match.marcatori.find((m) => m.giocatoreId === playerId)?.gol ?? 0
  if (!gol && match.mvpId !== playerId) return null
  return (
    <span className="shrink-0 text-sm">
      {gol > 0 && <span title={`${gol} gol`}>⚽{gol > 1 && <sub>{gol}</sub>}</span>}
      {match.mvpId === playerId && <span title="MVP"> ⭐</span>}
    </span>
  )
}

function Tabellino({ match }: { match: Match }) {
  const tutti = new Map([...match.squadraA, ...match.squadraB].map((p) => [p._id, p]))
  const marcatori = (squadra: Player[], autogol?: number) => [
    ...match.marcatori
      .filter((m) => squadra.some((p) => p._id === m.giocatoreId))
      .map((m) => `${displayName(tutti.get(m.giocatoreId)!)}${m.gol > 1 ? ` ×${m.gol}` : ''}`),
    ...(autogol ? [`autogol${autogol > 1 ? ` ×${autogol}` : ''}`] : []),
  ]
  const mvp = match.mvpId ? tutti.get(match.mvpId) : undefined
  return (
    <div className="space-y-2 pt-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center">
        <p className="text-xs text-zinc-500">{marcatori(match.squadraA, match.autogolA).join(', ')}</p>
        <p className="text-3xl font-bold tabular-nums">
          {match.risultato?.golA} – {match.risultato?.golB}
        </p>
        <p className="text-xs text-zinc-500">{marcatori(match.squadraB, match.autogolB).join(', ')}</p>
      </div>
      {mvp && (
        <p className="text-center text-sm">
          ⭐ MVP: <b>{displayName(mvp)}</b>
        </p>
      )}
    </div>
  )
}

// Pulsante per risultato, marcatori e MVP: attivo 1 minuto dopo la fine della partita.
function RisultatoAzione({ match }: { match: Match }) {
  if (match.stato === 'annullata' || !match.squadraA.length || !match.squadraB.length) return null
  const da = risultatoDa(match)
  if (new Date() < da) {
    if (match.stato !== 'chiusa') return null
    return (
      <p className="text-sm text-zinc-500">
        📝 Risultato inseribile tra <Countdown target={da.toISOString()} />
      </p>
    )
  }
  return (
    <ButtonLink href={`/partite/${match._id}/risultato`} variant={match.stato === 'giocata' ? 'secondary' : 'primary'}>
      {match.stato === 'giocata' ? '✏️ Modifica risultato' : '📝 Inserisci risultato, marcatori e MVP'}
    </ButtonLink>
  )
}
