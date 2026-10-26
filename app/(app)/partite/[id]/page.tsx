import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { canEnterResults, displayName, getCurrentPlayer, getUtente, membroDi, mioInCima, type Membro, type Player } from '@/lib/player'
import { forza, nomeSquadra, numeroSquadra } from '@/lib/teams'
import { finestra, formatoInCorso, getMatch, getPlayers, orarioPartita, ordinati, presenti, risultatoDa, type Match, type Risposta } from '@/lib/matches'
import { getCollegamento, stravaConfigurato } from '@/lib/strava'
import { KmPartita } from '@/components/km-partita'
import { MeteoPartita } from '@/components/meteo-partita'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'
import { aggiungiDaAttesa, allungaFinestra, apriConvocazioni, cambiaSquadra, cambiaStato, convocaGiocatore, scegliLega, rimettiInAttesa, togliDallaPartita, togliDallaSquadra } from '@/app/actions'
import { Countdown } from '@/components/countdown'
import { ApriConvocazioni } from '@/components/apri-convocazioni'
import { baseUrl } from '@/lib/url'
import { SubmitButton } from '@/components/submit-button'
import { SwipeRiga } from '@/components/swipe-riga'
import { ButtonLink, Card, Loading, PlayerRow, StatoBadge, buttonClass } from '@/components/ui'
import { FinestraInfo } from '../finestra-info'
import { RispostaButtons } from '../risposta-buttons'
import { Cassa, PagamentoInLista } from './cassa'
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
  const [rosa, attiva, t] = await Promise.all([getPlayers(match.legaId), getCurrentPlayer(), getT()])

  const count = presenti(match).length
  const formato = formatoInCorso(match)
  const aggiunti = presenti(match).filter((c) => c.aggiunto).length
  const gestisci = !!player.isAdmin && match.stato !== 'giocata' && match.stato !== 'annullata'
  const risposto = new Set(match.convocazioni.map((c) => c.giocatore?._id))
  // L'organizzatore può convocare chi manca con uno swipe a destra (anche a convocazioni chiuse).
  const convoca = gestisci && !match.torneo
  const mancanti = finestra(match) === 'aperta' || convoca ? rosa.filter((p) => p.attivo !== false && !risposto.has(p._id)) : []

  return (
    <div className="space-y-4">
      {attiva && attiva.lega._id !== match.legaId && (
        <form
          action={scegliLega.bind(null, match.legaId, `/partite/${match._id}`)}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <span>
            {t('Questa partita è della lega')} <b>{player.lega.nome}</b>
          </span>
          <SubmitButton className={buttonClass('secondary')}>{t('Passa a questa lega')}</SubmitButton>
        </form>
      )}
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold leading-tight">
            <span className="block capitalize">{t.giorno(match.data)}</span>
            <span className="block">
              {t('Inizio {ora}', { ora: t.ora(match.data) })}
              <Suspense>
                <MeteoPartita citta={player.lega.citta} data={match.data} compatto />
              </Suspense>
            </span>
          </h1>
          <StatoBadge match={match} />
        </div>
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">🏟️ {player.lega.nome}</p>
        {match.torneo && (
          <Link href={`/tornei/${match.torneo._id}`} className="block text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400">
            🏆 {match.torneo.nome} ·{' '}
            {match.fase === 'eliminazione' || match.torneo.formato === 'eliminazione'
              ? t('Tabellone · turno {n}', { n: match.turno ?? 1 })
              : `${match.girone ? `${t('Girone {g}', { g: match.girone })} · ` : ''}${t('Giornata {n}', { n: match.turno ?? 1 })}`}{' '}
            · {match.nomeA} – {match.nomeB}
          </Link>
        )}
        <p className="text-sm text-zinc-500">
          📍 {match.luogo}
          {match.quota != null && ` · ${t('{quota} € a testa', { quota: match.quota })}`}
        </p>

        {match.note && <p className="whitespace-pre-line text-sm">{match.note}</p>}
        <FinestraInfo match={match} />
        {match.serieId && (
          <p className="text-sm text-zinc-500">
            🔁 {t('Partita ricorrente')}
            {player.isAdmin && (
              <>
                {' · '}
                <Link href={`/partite/ricorrenti/${match.serieId}`} className="text-green-700 hover:underline dark:text-green-400">
                  {t('modifica la serie')}
                </Link>
              </>
            )}
          </p>
        )}
        {match.stato === 'giocata' && match.risultato?.golA != null && <Tabellino match={match} />}
        {canEnterResults(player) && <RisultatoAzione match={match} t={t} />}
        <div className="border-t border-zinc-200 pt-3 empty:hidden dark:border-zinc-800">
          {!player.ospite && <RispostaButtons match={match} playerId={player._id} />}
        </div>
      </Card>

      <KmCard match={match} me={player} rosa={rosa} />

      {player.isAdmin && match.stato !== 'giocata' && <AdminPanel match={match} whatsappUrl={await whatsappUrl(match, player.lega.nome, t)} t={t} />}

      {match.squadraA.length + match.squadraB.length > 0 && (
        <Squadre match={match} mioId={player._id} gestisci={!!player.isAdmin && match.stato === 'chiusa'} t={t} />
      )}

      {player.isAdmin && <Cassa match={match} mioId={player._id} />}

      <Card>
        <h2 className="mb-3 font-semibold">
          {t('Convocati')}{' '}
          <span className="font-normal text-zinc-500">
            · {formato ? t('{n} iscritti', { n: formato.iscritti }) : `${count}/${match.postiDisponibili}`}
          </span>
          {aggiunti > 0 && (
            <span className="ml-1 text-xs font-normal text-zinc-500">
              ({match.postiDisponibili - aggiunti} + {t.n(aggiunti, '{n} aggiunto', '{n} aggiunti')})
            </span>
          )}
        </h2>
        {formato && (
          <p className="mb-3 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
            📋 {t('Numero in base alle convocazioni:')} <TestoFormato f={formato} t={t} />
          </p>
        )}
        <Gruppo titolo={t('In lista')} match={match} risposta="presente" numerati gestisci={gestisci} me={player} mioId={player._id} t={t} />
        <Gruppo titolo={t('Lista d’attesa')} match={match} risposta="riserva" numerati gestisci={gestisci} mioId={player._id} t={t} />
        <Gruppo titolo={t('Non ci sono')} match={match} risposta="assente" convoca={convoca} mioId={player._id} t={t} />
        {mancanti.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t('Non hanno ancora risposto ({n})', { n: mancanti.length })}
            </h3>
            <ul className="space-y-2 opacity-60">
              {mancanti.map((p) => (
                <li key={p._id}>
                  {convoca ? (
                    <SwipeRiga destra={{ azione: convocaGiocatore.bind(null, match._id, p._id), label: t('Convoca') }}>
                      <PlayerRow player={p} />
                    </SwipeRiga>
                  ) : (
                    <PlayerRow player={p} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {match.convocazioni.length === 0 && mancanti.length === 0 && <p className="text-sm text-zinc-500">{t('Nessuna risposta.')}</p>}
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
  convoca,
  me,
  mioId,
  t,
}: {
  t: T
  titolo: string
  match: Match
  risposta: Risposta
  numerati?: boolean
  /** L'organizzatore può spostare persone tra lista e lista d'attesa. */
  gestisci?: boolean
  /** L'organizzatore convoca con uno swipe a destra (chi non c'è). */
  convoca?: boolean
  /** Per mostrare accanto ai nomi in lista chi ha pagato la quota (e l'icona per pagare). */
  me?: Membro
  /** Il mio nome va in cima e in grassetto (il numero resta la mia posizione in lista). */
  mioId?: string
}) {
  const items = mioInCima(
    ordinati(match, risposta).map((c, i) => ({ ...c, posizione: i + 1 })),
    mioId,
    (c) => c.giocatore?._id,
  )
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {titolo} ({items.length})
      </h3>
      <ul className="space-y-2">
        {items.map((c) => {
          const riga = (
            <PlayerRow
              player={c.giocatore}
              mio={c.giocatore?._id === mioId}
              // pagamento a sinistra del voto: l'icona Satispay apre Satispay
              prima={me && <PagamentoInLista match={match} me={me} playerId={c.giocatore._id} />}
              right={
                <>
                  {c.aggiunto && risposta === 'presente' && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{t('aggiunto')}</span>
                  )}
                  {gestisci && risposta === 'riserva' && (
                    <form action={aggiungiDaAttesa.bind(null, match._id, c._key)}>
                      <SubmitButton className={`${buttonClass('secondary')} px-2 py-1 text-xs`} title={t('Mettilo in lista: i partecipanti salgono di uno')}>
                        ➕ {t('Aggiungi')}
                      </SubmitButton>
                    </form>
                  )}
                  {gestisci && risposta === 'presente' && c.aggiunto && (
                    <form action={rimettiInAttesa.bind(null, match._id, c._key)}>
                      <SubmitButton className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" title={t('Rimettilo in lista d’attesa')}>
                        ↩ {t('In attesa')}
                      </SubmitButton>
                    </form>
                  )}
                </>
              }
            />
          )
          return (
            <li key={c._key} className="flex items-center gap-2">
              {numerati && <span className="w-5 text-right text-xs tabular-nums text-zinc-400">{c.posizione}</span>}
              <div className="min-w-0 flex-1">
                {convoca ? (
                  <SwipeRiga destra={{ azione: convocaGiocatore.bind(null, match._id, c.giocatore._id), label: t('Convoca') }}>{riga}</SwipeRiga>
                ) : (
                  riga
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Squadre({ match, mioId, gestisci, t }: { match: Match; mioId: string; gestisci: boolean; t: T }) {
  const teams: ['A' | 'B', Player[], string][] = [
    ['A', match.squadraA, 'border-t-blue-500'],
    ['B', match.squadraB, 'border-t-orange-500'],
  ]
  const mia = match.squadraA.some((p) => p._id === mioId) ? 'A' : match.squadraB.some((p) => p._id === mioId) ? 'B' : null
  // Nelle partite dei tornei le squadre hanno un nome.
  const nome = (l: 'A' | 'B') => (l === 'A' ? match.nomeA : match.nomeB) ?? nomeSquadra(l, t)
  const inSquadra = new Set([...match.squadraA, ...match.squadraB].map((p) => p._id))
  const senzaSquadra = presenti(match)
    .map((c) => c.giocatore)
    .filter((p) => p && !inSquadra.has(p._id))
  return (
    <div className="space-y-3">
      {mia && match.stato !== 'giocata' && (
        <p className={`rounded-xl p-3 text-center text-sm font-medium text-white ${mia === 'A' ? 'bg-blue-600' : 'bg-orange-500'}`}>
          {match.torneo ? t('La tua squadra: {squadra}', { squadra: nome(mia) }) : t('Sei nella {squadra}', { squadra: nome(mia) })}
          {match.pettorine === mia && ` · 🦺 ${t('porta la pettorina!')}`}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map(([lettera, players, color]) => {
          const totale = players.reduce((s, p) => s + forza(p), 0)
          return (
            <Card key={lettera} className={`border-t-4 ${color}`}>
              <h2 className="mb-3 flex items-center justify-between gap-2 font-semibold">
                <span>
                  {nome(lettera)}
                  {match.pettorine === lettera && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal dark:bg-zinc-800">🦺 {t('pettorine')}</span>}
                </span>
                <span className="text-sm font-normal text-zinc-500">{t('forza')} {t.numero(totale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </h2>
              <ul className="space-y-2">
                {mioInCima(players, mioId, (p) => p._id).map((p) => (
                  <li key={p._id}>
                    {gestisci ? (
                      // swipe a sinistra: torna tra quelli da allocare; a destra: passa nell'altra squadra
                      <SwipeRiga
                        sinistra={{ azione: togliDallaSquadra.bind(null, match._id, p._id), label: t('Togli') }}
                        destra={{ azione: cambiaSquadra.bind(null, match._id, p._id, lettera === 'A' ? 'B' : 'A'), label: t('Scambia') }}
                      >
                        <PlayerRow player={p} mio={p._id === mioId} prima={<Prestazione match={match} playerId={p._id} />} />
                      </SwipeRiga>
                    ) : (
                      <PlayerRow player={p} mio={p._id === mioId} prima={<Prestazione match={match} playerId={p._id} />} />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>
      {gestisci && senzaSquadra.length > 0 && (
        <Card className="space-y-2 border-dashed">
          <h2 className="font-semibold">{t('Senza squadra')}</h2>
          <p className="text-xs text-zinc-500">{t('In lista ma non ancora in una squadra: scegli dove metterli, o fai swipe a sinistra per toglierli dalla partita.')}</p>
          <ul className="space-y-2">
            {senzaSquadra.map((p) => (
              <li key={p._id}>
                <SwipeRiga
                  sinistra={{
                    azione: togliDallaPartita.bind(null, match._id, p._id),
                    label: t('Elimina'),
                    confirm: t('Togliere {nome} dalla partita? Passa tra i “non ci sono”.', { nome: displayName(p) }),
                  }}
                >
                  <PlayerRow
                    player={p}
                    mio={p._id === mioId}
                    right={
                      <span className="flex shrink-0 gap-1">
                        {(['A', 'B'] as const).map((l) => (
                          <form key={l} action={cambiaSquadra.bind(null, match._id, p._id, l)}>
                            <SubmitButton
                              className={`rounded-lg px-2 py-1 text-xs font-semibold text-white ${l === 'A' ? 'bg-blue-600' : 'bg-orange-500'}`}
                            >
                              → {match.torneo ? (l === 'A' ? match.nomeA : match.nomeB) : numeroSquadra(l)}
                            </SubmitButton>
                          </form>
                        ))}
                      </span>
                    }
                  />
                </SwipeRiga>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

async function whatsappUrl(match: Match, legaNome: string, t: T) {
  const breve = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' } as const
  const testo = [
    `⚽ *${t('Convocazioni aperte!')}* · ${legaNome}`,
    `📅 ${t.data(match.data, breve)}`,
    `📍 ${match.luogo}`,
    `👥 ${t('{n} posti', { n: match.postiDisponibili })}${match.quota != null ? ` · ${match.quota} €` : ''}`,
    `⏳ ${t('Rispondi entro {data}', { data: t.data(match.chiusuraConvocazioni, breve) })}`,
    '',
    `👉 ${await baseUrl()}/partite/${match._id}`,
  ].join('\n')
  return `https://wa.me/?text=${encodeURIComponent(testo)}`
}

function AdminPanel({ match, whatsappUrl, t }: { match: Match; whatsappUrl: string; t: T }) {
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
      <h2 className="font-semibold">{t('Gestione organizzatore')}</h2>

      {(fin === 'non_ancora' || fin === 'aperta') && (
        <div className="space-y-2">
          <ApriConvocazioni
            action={apriConvocazioni.bind(null, match._id)}
            label={fin === 'non_ancora' ? `📣 ${t('Apri convocazioni')}` : `🔔 ${t('Avvisa di nuovo')}`}
            conferma={fin === 'non_ancora' ? t('Aprire adesso le convocazioni e avvisare tutti?') : t('Mandare di nuovo la notifica a tutti?')}
            whatsappUrl={whatsappUrl}
          />
          {match.notificaInviataIl && (
            <p className="text-xs text-zinc-500">
              {t('Giocatori avvisati {data}', { data: t.data(match.notificaInviataIl, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
            </p>
          )}
        </div>
      )}

      {match.stato === 'aperta' && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">⚖️ {t('Le formazioni si fanno dopo aver chiuso le convocazioni.')}</p>
          {scaduta && <p className="text-sm text-amber-700 dark:text-amber-400">{t('Il tempo per convocarsi è finito: chiudi le convocazioni per fare le squadre, oppure allunga la finestra.')}</p>}
          {new Date(match.chiusuraConvocazioni) < new Date(match.data) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">⏱ {t('Allunga la finestra:')}</span>
              {(
                [
                  [60, t('+1 ora')],
                  [1440, t('+1 giorno')],
                ] as const
              ).map(([minuti, label]) => (
                <form key={minuti} action={allungaFinestra.bind(null, match._id, minuti)}>
                  <SubmitButton className={`${buttonClass('secondary')} px-3 py-1`}>{label}</SubmitButton>
                </form>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {statoForm('chiusa', `🔒 ${t('Chiudi convocazioni')}`, scaduta ? 'primary' : 'secondary', scaduta ? undefined : t('Chiudere le convocazioni prima della scadenza?'))}
            <ButtonLink href={`/partite/${match._id}/modifica`} variant="secondary">
              {t('Modifica')}
            </ButtonLink>
          </div>
        </div>
      )}

      {/* Nei tornei le squadre sono fisse: niente formazioni né convocazioni da riaprire */}
      {match.stato === 'chiusa' && !match.torneo && (
        <>
          <div className="flex flex-wrap gap-2">
            {count >= 2 && new Date() < risultatoDa(match) && (
              <ButtonLink href={`/partite/${match._id}/formazioni`} variant={match.squadraA.length ? 'secondary' : 'primary'}>
                ⚖️ {match.squadraA.length ? t('Modifica formazioni') : t('Fai le formazioni')}
              </ButtonLink>
            )}
            {statoForm('aperta', t('Riapri convocazioni'), 'secondary')}
          </div>
        </>
      )}


      <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {match.stato === 'annullata'
          ? statoForm('aperta', t('Ripristina partita'), 'secondary')
          : match.stato !== 'giocata' && statoForm('annullata', t('Annulla partita'), 'danger', t('Annullare la partita?'))}
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
  const [utente, t] = await Promise.all([mostroMiei ? getUtente() : null, getT()])
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
          <h2 className="mb-2 font-semibold">🏃 {t('Km percorsi')}</h2>
          <ol className="space-y-1 text-sm">
            {classifica.map((d, i) => (
              <li key={d.giocatoreId} className={`flex justify-between ${d.giocatoreId === me._id ? 'font-bold' : ''}`}>
                <span>
                  <span className="mr-2 tabular-nums text-zinc-400">{i + 1}</span>
                  {nomi.get(d.giocatoreId) ?? t('Giocatore')}
                </span>
                <span className="tabular-nums">{t.numero(d.km, { maximumFractionDigits: 2 })} km</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}

// Gol, MVP e km del giocatore in questa partita (i km accanto al voto).
async function Prestazione({ match, playerId }: { match: Match; playerId: string }) {
  const gol = match.marcatori.find((m) => m.giocatoreId === playerId)?.gol ?? 0
  const km = match.distanze.find((d) => d.giocatoreId === playerId)?.km
  if (!gol && match.mvpId !== playerId && km == null) return null
  const t = await getT()
  return (
    // gol e MVP, poi i km subito accanto al voto
    <span className="flex shrink-0 items-center gap-1.5 text-sm">
      {gol > 0 && <span title={t('{n} gol', { n: gol })}>⚽{gol > 1 && <sub>{gol}</sub>}</span>}
      {match.mvpId === playerId && <span title="MVP">🫑</span>}
      {km != null && (
        <span title={t('Km percorsi')} className="whitespace-nowrap text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          {t.numero(km, { maximumFractionDigits: 1 })} km
        </span>
      )}
    </span>
  )
}

// Pulsante per risultato, marcatori e MVP: attivo 1 minuto dopo la fine della partita.
function RisultatoAzione({ match, t }: { match: Match; t: T }) {
  if (match.stato === 'annullata' || !match.squadraA.length || !match.squadraB.length) return null
  const da = risultatoDa(match)
  if (new Date() < da) {
    if (match.stato !== 'chiusa') return null
    return (
      <p className="text-sm text-zinc-500">
        📝 {t('Risultato inseribile tra')} <Countdown target={da.toISOString()} />
      </p>
    )
  }
  return (
    <ButtonLink href={`/partite/${match._id}/risultato`} variant={match.stato === 'giocata' ? 'secondary' : 'primary'}>
      {match.stato === 'giocata' ? `✏️ ${t('Modifica risultato')}` : `📝 ${t('Inserisci risultato, marcatori e MVP')}`}
    </ButtonLink>
  )
}

function TestoFormato({ f, t }: { f: NonNullable<ReturnType<typeof formatoInCorso>>; t: T }) {
  if (f.iscritti < 2) return <>{t('in base alle convocazioni')}</>
  return (
    <>
      {t('se si chiudesse ora: {n} contro {n}', { n: f.perSquadra })}
      {f.inAttesa > 0 && ` (${t('{n} in lista d’attesa', { n: f.inAttesa })})`}
    </>
  )
}
