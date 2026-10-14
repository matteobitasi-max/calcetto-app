import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { canEnterResults, displayName, getCurrentPlayer, getUtente, membroDi, type Membro, type Player } from '@/lib/player'
import { forza } from '@/lib/teams'
import { finestra, formatoInCorso, getMatch, getPlayers, orarioPartita, ordinati, presenti, risultatoDa, type Match, type Risposta } from '@/lib/matches'
import { getCollegamento, stravaConfigurato } from '@/lib/strava'
import { KmPartita } from '@/components/km-partita'
import { MeteoPartita } from '@/components/meteo-partita'
import { formatData } from '@/lib/dates'
import { aggiungiDaAttesa, allungaFinestra, apriConvocazioni, cambiaStato, scegliLega, rimettiInAttesa } from '@/app/actions'
import { Countdown } from '@/components/countdown'
import { ApriConvocazioni } from '@/components/apri-convocazioni'
import { baseUrl } from '@/lib/url'
import { SubmitButton } from '@/components/submit-button'
import { ButtonLink, Card, Loading, PlayerRow, StatoBadge, buttonClass } from '@/components/ui'
import { FinestraInfo } from '../finestra-info'
import { RispostaButtons } from '../risposta-buttons'
import { Cassa, MiaQuota, PagamentoInLista } from './cassa'
import { Tabellino } from '../tabellino'

export default function MatchPage({ params }: PageProps<'/partite/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <MatchDetail params={params} />
    </Suspense>
  )
}

async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  // Le partite si vedono solo tra membri della lega; vale la mia scheda in quella lega.
  const player = await membroDi(match?.legaId)
  if (!match || !player) notFound()
  const [rosa, attiva] = await Promise.all([getPlayers(match.legaId), getCurrentPlayer()])

  const count = presenti(match).length
  const formato = formatoInCorso(match)
  const aggiunti = presenti(match).filter((c) => c.aggiunto).length
  const gestisci = !!player.isAdmin && match.stato !== 'giocata' && match.stato !== 'annullata'
  const risposto = new Set(match.convocazioni.map((c) => c.giocatore?._id))
  const mancanti = finestra(match) === 'aperta' ? rosa.filter((p) => p.attivo !== false && !risposto.has(p._id)) : []

  return (
    <div className="space-y-4">
      {attiva && attiva.lega._id !== match.legaId && (
        <form
          action={scegliLega.bind(null, match.legaId, `/partite/${match._id}`)}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <span>
            Questa partita è della lega <b>{player.lega.nome}</b>
          </span>
          <SubmitButton className={buttonClass('secondary')}>Passa a questa lega</SubmitButton>
        </form>
      )}
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold capitalize">{formatData(match.data)}</h1>
          <StatoBadge match={match} />
        </div>
        <p className="text-sm text-zinc-500">
          📍 {match.luogo}
          {match.quota != null && ` · ${match.quota} € a testa`}
        </p>
        {match.stato !== 'giocata' && match.stato !== 'annullata' && (
          <Suspense>
            <MeteoPartita citta={player.lega.citta} data={match.data} />
          </Suspense>
        )}
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
          {!player.ospite && <RispostaButtons match={match} playerId={player._id} />}
        </div>
      </Card>

      <MiaQuota match={match} me={player} />

      <KmCard match={match} me={player} rosa={rosa} />

      {player.isAdmin && match.stato !== 'giocata' && <AdminPanel match={match} whatsappUrl={await whatsappUrl(match, player.lega.nome)} />}

      {match.squadraA.length + match.squadraB.length > 0 && (
        <Squadre match={match} mioId={player._id} />
      )}

      {player.isAdmin && <Cassa match={match} />}

      <Card>
        <h2 className="mb-3 font-semibold">
          Convocati{' '}
          <span className="font-normal text-zinc-500">
            · {formato ? `${formato.iscritti} iscritti` : `${count}/${match.postiDisponibili}`}
          </span>
          {aggiunti > 0 && (
            <span className="ml-1 text-xs font-normal text-zinc-500">
              ({match.postiDisponibili - aggiunti} + {aggiunti} aggiunt{aggiunti === 1 ? 'o' : 'i'})
            </span>
          )}
        </h2>
        {formato && (
          <p className="mb-3 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
            📋 Numero in base alle convocazioni: <TestoFormato f={formato} />
          </p>
        )}
        <Gruppo titolo="In lista" match={match} risposta="presente" numerati gestisci={gestisci} me={player} />
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
  me,
}: {
  titolo: string
  match: Match
  risposta: Risposta
  numerati?: boolean
  /** L'organizzatore può spostare persone tra lista e lista d'attesa. */
  gestisci?: boolean
  /** Per mostrare accanto ai nomi in lista chi ha pagato la quota (e l'icona per pagare). */
  me?: Membro
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
                    {me && <PagamentoInLista match={match} me={me} playerId={c.giocatore._id} />}
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

function Squadre({ match, mioId }: { match: Match; mioId: string }) {
  const teams: ['A' | 'B', Player[], string][] = [
    ['A', match.squadraA, 'border-t-blue-500'],
    ['B', match.squadraB, 'border-t-orange-500'],
  ]
  const mia = match.squadraA.some((p) => p._id === mioId) ? 'A' : match.squadraB.some((p) => p._id === mioId) ? 'B' : null
  return (
    <div className="space-y-3">
      {mia && match.stato !== 'giocata' && (
        <p className={`rounded-xl p-3 text-center text-sm font-medium text-white ${mia === 'A' ? 'bg-blue-600' : 'bg-orange-500'}`}>
          Sei nella Squadra {mia}
          {match.pettorine === mia && ' · 🦺 porta la pettorina!'}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map(([lettera, players, color]) => {
          const totale = players.reduce((s, p) => s + forza(p), 0)
          return (
            <Card key={lettera} className={`border-t-4 ${color}`}>
              <h2 className="mb-3 flex items-center justify-between gap-2 font-semibold">
                <span>
                  Squadra {lettera}
                  {match.pettorine === lettera && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal dark:bg-zinc-800">🦺 pettorine</span>}
                </span>
                <span className="text-sm font-normal text-zinc-500">forza {totale.toFixed(1)}</span>
              </h2>
              <ul className="space-y-2">
                {players.map((p) => (
                  <li key={p._id}>
                    <PlayerRow player={p} prima={<Prestazione match={match} playerId={p._id} />} />
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

async function whatsappUrl(match: Match, legaNome: string) {
  const breve = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' } as const
  const testo = [
    `⚽ *Convocazioni aperte!* · ${legaNome}`,
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
          <p className="text-xs text-zinc-500">⚖️ Le formazioni si fanno dopo aver chiuso le convocazioni.</p>
          {scaduta && <p className="text-sm text-amber-700 dark:text-amber-400">Il tempo per convocarsi è finito: chiudi le convocazioni per fare le squadre, oppure allunga la finestra.</p>}
          {new Date(match.chiusuraConvocazioni) < new Date(match.data) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">⏱ Allunga la finestra:</span>
              {(
                [
                  [60, '+1 ora'],
                  [1440, '+1 giorno'],
                ] as const
              ).map(([minuti, label]) => (
                <form key={minuti} action={allungaFinestra.bind(null, match._id, minuti)}>
                  <SubmitButton className={`${buttonClass('secondary')} px-3 py-1`}>{label}</SubmitButton>
                </form>
              ))}
            </div>
          )}
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
            {count >= 2 && new Date() < risultatoDa(match) && (
              <ButtonLink href={`/partite/${match._id}/formazioni`} variant={match.squadraA.length ? 'secondary' : 'primary'}>
                ⚖️ {match.squadraA.length ? 'Modifica formazioni' : 'Fai le formazioni'}
              </ButtonLink>
            )}
            {statoForm('aperta', 'Riapri convocazioni', 'secondary')}
          </div>
        </>
      )}


      <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {match.stato === 'annullata'
          ? statoForm('aperta', 'Ripristina partita', 'secondary')
          : match.stato !== 'giocata' && statoForm('annullata', 'Annulla partita', 'danger', 'Annullare la partita?')}
      </div>
    </Card>
  )
}

// Km percorsi: i miei (da aggiungere a partita finita) e la classifica della partita.
async function KmCard({ match, me, rosa }: { match: Match; me: Membro; rosa: Player[] }) {
  const { inizio, fine } = orarioPartita(match)
  const inLista = presenti(match).some((c) => c.giocatore._id === me._id)
  const mostroMiei = match.stato !== 'annullata' && inLista && !me.ospite && new Date() >= fine
  if (!mostroMiei && match.distanze.length === 0) return null
  const utente = mostroMiei ? await getUtente() : null
  const collegato = !!(utente && stravaConfigurato() && (await getCollegamento(utente.id)))
  const nomi = new Map([...rosa, ...presenti(match).map((c) => c.giocatore)].map((p) => [p._id, displayName(p)]))
  const classifica = [...match.distanze].sort((a, b) => b.km - a.km)

  return (
    <Card className="space-y-4 empty:hidden">
      {mostroMiei && (
        <KmPartita
          matchId={match._id}
          miei={match.distanze.find((d) => d.giocatoreId === me._id)}
          inizio={inizio.getTime()}
          fine={fine.getTime()}
          stravaAttivo={stravaConfigurato()}
          stravaCollegato={collegato}
        />
      )}
      {classifica.length > 0 && (
        <div className={mostroMiei ? 'border-t border-zinc-200 pt-3 dark:border-zinc-800' : ''}>
          <h2 className="mb-2 font-semibold">🏃 Km percorsi</h2>
          <ol className="space-y-1 text-sm">
            {classifica.map((d, i) => (
              <li key={d.giocatoreId} className={`flex justify-between ${d.giocatoreId === me._id ? 'font-bold' : ''}`}>
                <span>
                  <span className="mr-2 tabular-nums text-zinc-400">{i + 1}</span>
                  {nomi.get(d.giocatoreId) ?? 'Giocatore'}
                </span>
                <span className="tabular-nums">{d.km.toLocaleString('it-IT', { maximumFractionDigits: 2 })} km</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}

// Km, gol e MVP del giocatore in questa partita.
function Prestazione({ match, playerId }: { match: Match; playerId: string }) {
  const gol = match.marcatori.find((m) => m.giocatoreId === playerId)?.gol ?? 0
  const km = match.distanze.find((d) => d.giocatoreId === playerId)?.km
  if (!gol && match.mvpId !== playerId && km == null) return null
  return (
    <span className="shrink-0 text-sm">
      {km != null && (
        <span title="Km percorsi" className="mr-1 whitespace-nowrap text-xs font-medium text-zinc-500">
          🏃{km.toLocaleString('it-IT', { maximumFractionDigits: 1 })} km
        </span>
      )}
      {gol > 0 && <span title={`${gol} gol`}>⚽{gol > 1 && <sub>{gol}</sub>}</span>}
      {match.mvpId === playerId && <span title="MVP"> 🫑</span>}
    </span>
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

function TestoFormato({ f }: { f: NonNullable<ReturnType<typeof formatoInCorso>> }) {
  if (f.iscritti < 2) return <>in base alle convocazioni</>
  return (
    <>
      se si chiudesse ora: {f.perSquadra} contro {f.perSquadra}
      {f.inAttesa > 0 && ` (${f.inAttesa} in lista d'attesa)`}
    </>
  )
}
