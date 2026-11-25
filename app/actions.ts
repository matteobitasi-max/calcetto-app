'use server'

import { randomInt, randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { refresh, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sanity } from '@/lib/sanity'
import { leggiCampo } from '@/lib/campo'
import { periodoInCorso } from '@/lib/stagioni'
import { statoClub } from '@/lib/club-stato'
import { liberaPerPartita, prenotaPerPartita, spostaPrenotazione, verificaPrenotazione } from '@/lib/centro-app'
import { BADGE, CATEGORIE_NOTIFICHE, COOKIE_LEGA, eta, leggiRuolo, normalizzaTelefono, PIEDI, RUOLI, SKILLS, displayName, requirePlayer, getUtente, getMemberships, isTitolare, membroDi, soloGiocatore, requireAdmin, requireForDoc, requireIn, type Player, type Skill } from '@/lib/player'
import { assegnaPosti, conSelezione, finestra, getMatch, getPartiteTorneo, getPlayers, orarioPartita, presenti, risultatoDa, type FonteKm, type Match, type Risposta, type Stato } from '@/lib/matches'
import { idPlaylist, intervisteDellaPlaylist } from '@/lib/interviste'
import { kmStrava, scollega, stravaConfigurato, urlCollegamento } from '@/lib/strava'
import { SITO, baseUrl } from '@/lib/url'
import { cercaCitta } from '@/lib/meteo'
import { MAX_ALLENAMENTO, MAX_GIOCATORI, MAX_ISCRITTI } from '@/lib/limiti'
import { riscriviPartita, type MatchDaUnire } from '@/lib/unisci'
import { addDays, daysBetween, isoToRomeLocal, romeLocalToISO } from '@/lib/dates'
import { LIMITE_BYTE, leggiIcs, scaricaIcs, type EventoEsterno } from '@/lib/importa-calendario'
import { inviaAGiocatori, inviaATutti, rimuoviIscrizione, salvaIscrizione, salvaTokenNativo, type PushSub } from '@/lib/push'
import { chiudiConvocazioni, convocati } from '@/lib/chiusura'
import { assicuraRicorrenze, getSeries, occurrenceId, rimuoviFutureVuote, type Series } from '@/lib/series'
import { getTorneo, iscrizioniAperte, puoCreareTornei } from '@/lib/tornei'
import { VERSIONE_TERMINI, type Consensi } from '@/lib/consensi'
import { LETTERE_GIRONI, SQUADRE_PREDEFINITE, classifica, nomePredefinito, giornate, incrociGironi } from '@/lib/girone'
import { daCreare, primoTurnoTeste, primoTurnoValido, tabellone } from '@/lib/tabellone'
import { nomeSquadra } from '@/lib/teams'
import { formaDellaLega, ioPro, legaPro, organizzatoriPro } from '@/lib/pro'
import { mioClub, sincronizzaAbbonamento } from '@/lib/abbonamenti'
import { MAX_LEGHE_CLUB } from '@/lib/entitlement'
import { isFormato, moduloPer, moduloValido, posti as postiModulo } from '@/lib/moduli'
import { indisponibileIl, type MotivoIndisponibile } from '@/lib/roster'
import { COOKIE_LINGUA, isLingua, type T } from '@/lib/i18n'
import { getLingua, getT } from '@/lib/lingua'

// Un messaggio per l'utente nella sua lingua.
const tr = async (testo: string, vars?: Record<string, string | number>) => (await getT())(testo, vars)
import { PARTITE_PER_REVISIONE, passoVoto } from '@/lib/forma'

export type FormState = { error?: string } | undefined

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()
const num = (fd: FormData, key: string) => {
  const v = str(fd, key)
  return v === '' ? undefined : Number(v)
}
const ref = (id: string) => ({ _type: 'reference' as const, _ref: id, _key: randomUUID() })

// ---------- Convocazioni ----------

type RawConvocazione = { _key: string; giocatore: { _ref: string }; risposta: Risposta; rispostoIl?: string }

export async function rispondi(matchId: string, risposta: 'presente' | 'assente') {
  // La mia scheda nella lega della partita.
  const player = soloGiocatore(await requireForDoc(matchId))

  // Lettura-modifica-scrittura con controllo di revisione: se due giocatori
  // rispondono nello stesso istante, il secondo riprova sui dati aggiornati.
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await sanity.fetch<
      (Pick<Match, '_rev' | 'stato' | 'aperturaConvocazioni' | 'chiusuraConvocazioni' | 'postiDisponibili' | 'data' | 'tipo' | 'squadra' | 'convocati'> & {
        convocazioni?: RawConvocazione[]
        torneo?: Match['torneo']
      }) | null
    >(
      `*[_type == "match" && _id == $id][0]{_rev, stato, aperturaConvocazioni, chiusuraConvocazioni, postiDisponibili, convocazioni, data, tipo, torneo,
        "squadra": lega->club == true && lega->tipo == "squadra" && lega->autoconvocazione != true, "convocati": convocati[]._ref}`,
      { id: matchId },
    )
    if (!doc) throw new Error('Partita non trovata')
    if (finestra(doc) !== 'aperta') throw new Error('Le convocazioni non sono aperte')
    // leghe "Squadra": rispondono solo i convocati dall'allenatore, e chi è indisponibile non può dire "ci sono"
    if (risposta === 'presente') {
      if (conSelezione(doc) && !(doc.convocati ?? []).includes(player._id)) throw new Error('Non sei tra i convocati di questa partita')
      if (indisponibileIl(player, isoToRomeLocal(doc.data).slice(0, 10))) throw new Error('Sei segnato come indisponibile')
    }

    const list = [...(doc.convocazioni ?? [])]
    const mine = list.findIndex((c) => c.giocatore?._ref === player._id)
    const already = mine >= 0 && list[mine].risposta !== 'assente'
    if (risposta === 'presente' && already) return

    const entry = {
      _key: mine >= 0 ? list[mine]._key : randomUUID(),
      _type: 'convocazione',
      giocatore: { _type: 'reference', _ref: player._id },
      risposta: risposta as Risposta,
      // Chi passa da "non ci sono" a "ci sono" si mette in coda.
      rispostoIl: new Date().toISOString(),
      // Chi era stato aggiunto dall'organizzatore e si cancella perde la priorità.
      ...(risposta === 'assente' && { aggiunto: false }),
    }
    if (mine >= 0) list[mine] = { ...list[mine], ...entry }
    else list.push(entry)

    try {
      await sanity
        .patch(matchId)
        .ifRevisionId(doc._rev)
        .set({ convocazioni: assegnaPosti(list, doc.postiDisponibili) })
        .commit()
      refresh()
      return
    } catch (err) {
      if (attempt === 2) throw err
    }
  }
}

// L'organizzatore prende una persona dalla lista d'attesa e la mette in lista:
// i partecipanti totali salgono di uno, gli altri restano dove sono.
export async function aggiungiDaAttesa(matchId: string, key: string) {
  await requireForDoc(matchId, 'organizzatore')
  await modificaLista(matchId, key, 'riserva', true, +1)
}

// Annulla l'aggiunta: torna in lista d'attesa e i partecipanti scendono di uno.
export async function rimettiInAttesa(matchId: string, key: string) {
  await requireForDoc(matchId, 'organizzatore')
  await modificaLista(matchId, key, 'presente', false, -1)
}

// L'organizzatore scambia uno in lista d'attesa (`entra`) con uno in lista (`esce`): si scambiano il posto
// in coda (l'ora della risposta), così i posti restano quelli e chi esce va in attesa al posto dell'altro.
// Se le squadre sono già fatte, chi entra prende il posto di chi esce nella sua squadra.
export async function scambiaConAttesa(matchId: string, entra: string, esce: string) {
  await requireForDoc(matchId, 'organizzatore')
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await sanity.fetch<SquadreRaw | null>(
      `*[_type == "match" && _id == $id][0]{_rev, stato, torneo, postiDisponibili, convocazioni, squadraA, squadraB}`,
      { id: matchId },
    )
    if (!doc) throw new Error('Partita non trovata')
    if (doc.stato !== 'aperta' && doc.stato !== 'chiusa') throw new Error('La partita è già giocata o annullata')
    const lista = doc.convocazioni ?? []
    const a = lista.find((c) => c._key === entra && c.risposta === 'riserva')
    const b = lista.find((c) => c._key === esce && c.risposta === 'presente')
    if (!a || !b) return refresh() // nel frattempo è cambiato qualcosa: si mostra la lista aggiornata
    const convocazioni = assegnaPosti(
      lista.map((c) =>
        c === a ? { ...c, risposta: 'presente' as Risposta, rispostoIl: b.rispostoIl, aggiunto: b.aggiunto } : c === b ? { ...c, risposta: 'riserva' as Risposta, rispostoIl: a.rispostoIl, aggiunto: false } : c,
      ),
      doc.postiDisponibili,
    )
    const sostituisci = (sq?: { _key: string; _ref: string }[]) => (sq ?? []).map((r) => (r._ref === b.giocatore._ref ? { ...r, _ref: a.giocatore._ref } : r))
    try {
      await sanity
        .patch(matchId)
        .ifRevisionId(doc._rev)
        .set({ convocazioni, squadraA: sostituisci(doc.squadraA), squadraB: sostituisci(doc.squadraB) })
        .commit()
      refresh()
      return
    } catch (err) {
      if (attempt === 2) throw err
    }
  }
}

// L'organizzatore convoca un giocatore della rosa che non si è convocato: risponde "ci sono" al suo posto
// e lo mette sempre in lista (scelto a mano, non va in lista d'attesa): se la lista è piena, i posti salgono di uno.
// Club scaduto da oltre la tolleranza (lib/club-stato.ts): convocati, formazione, pagelle e indisponibili
// si vedono ma non si modificano.
async function clubBloccato(lega: { club?: boolean; tipo?: string; clubScadeIl?: string }) {
  return lega.club && lega.tipo === 'squadra' && statoClub(lega.clubScadeIl) === 'sola-lettura' ? await tr('Il Club PRO di questa squadra è scaduto: rinnovalo per modificare, oppure rimetti la lega “tra amici” in Impostazioni lega.') : null
}

export async function convocaGiocatore(matchId: string, giocatoreId: string) {
  const admin = await requireForDoc(matchId, 'organizzatore')
  const bloccato = await clubBloccato(admin.lega)
  if (bloccato) throw new Error(bloccato)
  const giocatore = await sanity.fetch<{ legaId: string; attivo?: boolean; indisponibile?: Player['indisponibile'] } | null>(
    `*[_type == "player" && _id == $id][0]{"legaId": lega._ref, attivo, indisponibile}`,
    { id: giocatoreId },
  )
  if (!giocatore || giocatore.legaId !== admin.lega._id || giocatore.attivo === false) throw new Error('Il giocatore non è nella rosa')
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await sanity.fetch<
      { _rev: string; stato: Stato; torneo?: Match['torneo']; postiDisponibili: number; convocazioni?: RawConvocazione[]; data: string; tipo?: Match['tipo']; squadra?: boolean; convocati?: string[] } | null
    >(
      `*[_type == "match" && _id == $id][0]{_rev, stato, torneo, postiDisponibili, convocazioni, data, tipo,
        "squadra": lega->club == true && lega->tipo == "squadra" && lega->autoconvocazione != true, "convocati": convocati[]._ref}`,
      { id: matchId },
    )
    if (!doc) throw new Error('Partita non trovata')
    if ((doc.stato !== 'aperta' && doc.stato !== 'chiusa') || doc.torneo) throw new Error('In questa partita non si può convocare')
    if (indisponibileIl(giocatore, isoToRomeLocal(doc.data).slice(0, 10))) throw new Error('Il giocatore è indisponibile')
    const list = [...(doc.convocazioni ?? [])]
    const i = list.findIndex((c) => c.giocatore?._ref === giocatoreId)
    if (i >= 0 && list[i].risposta !== 'assente') return
    // leghe "Squadra": chi viene convocato entra anche tra i convocati dell'allenatore
    const selezione = conSelezione(doc) && !(doc.convocati ?? []).includes(giocatoreId) ? [...(doc.convocati ?? []), giocatoreId] : null
    const entry = {
      _key: i >= 0 ? list[i]._key : randomUUID(),
      _type: 'convocazione',
      giocatore: { _type: 'reference', _ref: giocatoreId },
      risposta: 'presente' as Risposta,
      rispostoIl: new Date().toISOString(),
      aggiunto: true,
    }
    const pieni = list.filter((c) => c.risposta === 'presente').length >= doc.postiDisponibili
    const posti = doc.postiDisponibili + (pieni ? 1 : 0)
    if (i >= 0) list[i] = { ...list[i], ...entry }
    else list.push(entry)
    try {
      await sanity
        .patch(matchId)
        .ifRevisionId(doc._rev)
        .set({ postiDisponibili: posti, convocazioni: assegnaPosti(list, posti), ...(selezione && { convocati: selezione.map(ref) }) })
        .commit()
      refresh()
      return
    } catch (err) {
      if (attempt === 2) throw err
    }
  }
}

// Leghe "Squadra": l'allenatore sceglie i convocati della partita. Solo loro possono rispondere; chi viene tolto
// esce dalla lista. I posti diventano quanti sono i convocati (niente lista d'attesa) e i nuovi ricevono l'avviso.
export async function salvaConvocati(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireForDoc(matchId, 'organizzatore')
  const bloccato = await clubBloccato(admin.lega)
  if (bloccato) return { error: bloccato }
  const scelti = [...new Set(formData.getAll('giocatore').map(String))]
  for (let attempt = 0; attempt < 3; attempt++) {
    const match = await getMatch(matchId)
    if (!match || !conSelezione(match)) return { error: await tr('Partita non trovata.') }
    if (match.stato !== 'aperta' && match.stato !== 'chiusa') return { error: await tr('La partita è già giocata o annullata.') }
    const giorno = isoToRomeLocal(match.data).slice(0, 10)
    const rosa = await getPlayers(admin.lega._id)
    const validi = new Set(rosa.filter((p) => p.attivo !== false && !indisponibileIl(p, giorno)).map((p) => p._id))
    const elenco = scelti.filter((id) => validi.has(id))
    if (elenco.length < 1) return { error: await tr('Scegli almeno un giocatore.') }
    const prima = new Set(match.convocati ?? [])
    const nuovi = elenco.filter((id) => !prima.has(id))
    const dentro = new Set(elenco)
    // chi non è più convocato esce dalla lista; gli altri tengono la loro risposta
    const lista = match.convocazioni
      .filter((c) => dentro.has(c.giocatore._id))
      .map((c) => ({ _key: c._key, _type: 'convocazione', giocatore: { _type: 'reference', _ref: c.giocatore._id }, risposta: c.risposta, rispostoIl: c.rispostoIl, aggiunto: c.aggiunto }))
    try {
      await sanity
        .patch(matchId)
        .ifRevisionId(match._rev)
        .set({ convocati: elenco.map(ref), postiDisponibili: elenco.length, postiAutomatici: false, convocazioni: assegnaPosti(lista as RawConvocazione[], elenco.length) })
        .commit()
    } catch (err) {
      if (attempt === 2) throw err
      continue
    }
    if (nuovi.length) {
      const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const
      const aperta = finestra(match) === 'aperta'
      await inviaAGiocatori(
        nuovi,
        (t) => ({
          title: `📋 ${t('Sei convocato!')}`,
          body: `${admin.lega.nome} · ${t.data(match.data, breve)} · ${match.luogo}\n${
            aperta ? t('Conferma entro {data}', { data: t.data(match.chiusuraConvocazioni, breve) }) : t('Potrai confermare dal {data}', { data: t.data(match.aperturaConvocazioni, breve) })
          }`,
          url: `/partite/${matchId}`,
          tag: matchId,
        }),
        'convocazioni',
      ).catch(() => undefined)
    }
    revalidatePath('/', 'layout')
    redirect(`/partite/${matchId}`)
  }
}

async function modificaLista(matchId: string, key: string, da: Risposta, aggiunto: boolean, delta: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await sanity.fetch<{ _rev: string; stato: Stato; postiDisponibili: number; convocazioni?: (RawConvocazione & { aggiunto?: boolean })[] } | null>(
      `*[_type == "match" && _id == $id][0]{_rev, stato, postiDisponibili, convocazioni}`,
      { id: matchId },
    )
    if (!doc) throw new Error('Partita non trovata')
    if (doc.stato === 'giocata' || doc.stato === 'annullata') throw new Error('La partita è chiusa')
    const c = doc.convocazioni?.find((x) => x._key === key)
    if (!c || c.risposta !== da || (!aggiunto && !c.aggiunto)) return

    const posti = doc.postiDisponibili + delta
    const list = doc.convocazioni!.map((x) => (x._key === key ? { ...x, aggiunto } : x))
    try {
      await sanity.patch(matchId).ifRevisionId(doc._rev).set({ postiDisponibili: posti, convocazioni: assegnaPosti(list, posti) }).commit()
      refresh()
      return
    } catch (err) {
      if (attempt === 2) throw err
    }
  }
}

// ---------- Partite (organizzatori) ----------

export async function salvaPartita(matchId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  // Nuova partita: nella lega scelta (dal calendario) o in quella attiva. Modifica: nella lega della partita.
  const legaScelta = str(formData, 'legaId')
  const admin = matchId
    ? await requireForDoc(matchId, 'organizzatore')
    : legaScelta
      ? await requireIn(legaScelta, 'organizzatore')
      : await requireAdmin()
  const lega = { _type: 'reference' as const, _ref: admin.lega._id }
  const luogo = str(formData, 'luogo')
  // il posto scelto dalla mappa (facoltativo)
  const campo = leggiCampo(formData.get('campo'))
  const [data, apertura, chiusura] = ['data', 'aperturaConvocazioni', 'chiusuraConvocazioni'].map((k) => {
    const v = str(formData, k)
    return v ? romeLocalToISO(v) : ''
  })
  const automatici = formData.get('postiAutomatici') === 'on'
  let posti = num(formData, 'postiDisponibili') ?? 10
  const durata = num(formData, 'durataMinuti') ?? 60
  const quota = num(formData, 'quota')
  const note = str(formData, 'note')
  // il tipo si sceglie alla creazione (partita o allenamento) e poi non cambia
  const allenamento = !matchId && str(formData, 'tipo') === 'allenamento'

  if (!Number.isInteger(durata) || durata < 10 || durata > 300) return { error: await tr('Durata non valida (10-300 minuti).') }
  const durataFinestra = Math.max(15, Math.round(num(formData, 'durataFinestraMinuti') ?? 120))
  if (!data || !luogo || !apertura || !chiusura) return { error: await tr('Compila data e ora della partita, campo e inizio delle convocazioni.') }
  if (apertura >= data) return { error: await tr('Le convocazioni devono aprirsi prima della partita.') }
  if (chiusura <= apertura) return { error: await tr('La chiusura delle convocazioni deve essere dopo l’apertura.') }
  if (chiusura > data) return { error: await tr('Le convocazioni devono chiudersi prima della partita.') }
  if (!Number.isInteger(posti) || posti < 2) return { error: await tr('Servono almeno 2 posti.') }
  // Oltre il limite si va solo aggiungendo persone dalla lista d'attesa: in modifica
  // si può lasciare il numero raggiunto così, ma non aumentarlo ancora.
  const attuale = matchId
    ? await sanity.fetch<{ posti?: number; stato?: Stato; tipo?: string } | null>(`*[_type == "match" && _id == $id][0]{"posti": postiDisponibili, stato, tipo}`, {
        id: matchId,
      })
    : null
  const postiAttuali = attuale?.posti ?? 0
  // In base alle convocazioni: aperte fino al massimo; a convocazioni chiuse il numero è già deciso.
  if (automatici) posti = attuale?.stato === 'chiusa' ? postiAttuali : MAX_ISCRITTI
  // all'allenamento non si gioca a squadre: i posti possono essere di più
  if ((allenamento || attuale?.tipo === 'allenamento') && posti > Math.max(MAX_ALLENAMENTO, postiAttuali)) {
    return { error: await tr('Massimo {n} posti.', { n: MAX_ALLENAMENTO }) }
  }
  if (!automatici && !allenamento && attuale?.tipo !== 'allenamento' && posti > Math.max(MAX_GIOCATORI, postiAttuali)) {
    return { error: await tr('Massimo {n} giocatori: per andare oltre aggiungi le persone dalla lista d’attesa.', { n: MAX_GIOCATORI }) }
  }

  // Partita ricorrente: si salva il modello e le partite vengono generate da lì.
  if (!matchId && formData.get('ripeti') === 'on') {
    const [giorno, ora] = str(formData, 'data').split('T')
    const [apGiorno, apOra] = str(formData, 'aperturaConvocazioni').split('T')
    const [chGiorno, chOra] = str(formData, 'chiusuraConvocazioni').split('T')
    const fineData = str(formData, 'fineData')
    if (fineData && fineData < giorno) return { error: await tr('La data di fine deve essere dopo la prima partita.') }
    const serie = await sanity.create({
      _type: 'series',
      lega,
      ...(allenamento && { tipo: 'allenamento' }),
      attiva: true,
      primaData: giorno,
      ora,
      ogniSettimane: num(formData, 'ogniSettimane') === 2 ? 2 : 1,
      ...(fineData && { fineData }),
      durataMinuti: durata,
      luogo,
      ...(campo && { campo }),
      postiDisponibili: posti,
      postiAutomatici: automatici,
      ...(quota != null && { quota }),
      ...(note && { note }),
      aperturaGiorniPrima: daysBetween(apGiorno, giorno),
      aperturaOra: apOra,
      chiusuraGiorniPrima: daysBetween(chGiorno, giorno),
      chiusuraOra: chOra,
      durataFinestraMinuti: durataFinestra,
    })
    await assicuraRicorrenze({ serie: { ...(serie as unknown as Series), legaId: admin.lega._id } })
    // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
    revalidatePath('/', 'layout')
    redirect(`/partite/${occurrenceId(serie._id, giorno)}`)
  }

  // Prenotazione del campo in un centro su The Cap (solo partite nuove, non ricorrenti): prima si controlla
  // che ci sia un campo libero, così la partita non nasce senza campo.
  const durataCampo = Math.ceil(durata / 30) * 30
  const prenota =
    !matchId && formData.get('prenotaCentro') === 'on' && campo && str(formData, 'centroId') && str(formData, 'gruppoCentro')
      ? { centroId: str(formData, 'centroId'), gruppo: str(formData, 'gruppoCentro'), inizio: data, durata: durataCampo }
      : null
  const verificata = prenota ? await verificaPrenotazione(prenota) : null
  if (verificata && 'errore' in verificata) return { error: verificata.errore }

  const fields = {
    data,
    durataMinuti: durata,
    luogo,
    aperturaConvocazioni: apertura,
    chiusuraConvocazioni: chiusura,
    durataFinestraMinuti: durataFinestra,
    postiDisponibili: posti,
    postiAutomatici: automatici,
  }
  let id = matchId
  if (id) {
    // Se cambiano i posti, la lista si riallinea: sale chi era in attesa o scende l'ultimo arrivato.
    const current = await sanity.fetch<{ convocazioni?: RawConvocazione[] } | null>(
      `*[_type == "match" && _id == $id][0]{convocazioni}`,
      { id },
    )
    // il campo prenotato su The Cap segue la partita (nuovo orario o durata), se il centro ha posto
    const prenotazione = await sanity.fetch<string | null>(`*[_type == "match" && _id == $id][0].prenotazione._ref`, { id })
    if (prenotazione) {
      const errore = await spostaPrenotazione(prenotazione, data, durataCampo)
      if (errore) return { error: errore }
    }
    await sanity
      .patch(id)
      .set({
        ...fields,
        convocazioni: assegnaPosti(current?.convocazioni ?? [], posti),
        ...(quota != null && { quota }),
        ...(note && { note }),
        ...(campo && { campo }),
      })
      .unset([...(quota == null ? ['quota'] : []), ...(note ? [] : ['note']), ...(campo ? [] : ['campo'])])
      .commit()
  } else {
    const doc = await sanity.create({
      _type: 'match',
      lega,
      ...(allenamento && { tipo: 'allenamento' }),
      ...fields,
      ...(quota != null && { quota }),
      ...(note && { note }),
      ...(campo && { campo }),
      stato: 'aperta',
      convocazioni: [],
    })
    id = doc._id
    if (verificata && prenota) {
      const fatta = await prenotaPerPartita(verificata.centro, {
        ...prenota,
        matchId: id,
        legaId: admin.lega._id,
        legaNome: admin.lega.nome,
        organizzatoreId: admin._id,
        organizzatore: displayName(admin),
        telefono: admin.telefono,
      })
      if (fatta) await sanity.patch(id).set({ prenotazione: { _type: 'reference', _ref: fatta.id, _weak: true } }).commit()
    }
  }
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/partite/${id}`)
}

// ---------- Importa da un calendario esterno ----------

export type LetturaCalendario = { error?: string; eventi?: (EventoEsterno & { presente: boolean })[]; tuttoIlGiorno?: number }

// Legge un calendario (.ics caricato o link pubblico) e mostra gli eventi futuri da scegliere.
// "presente": nella lega c'è già una partita (o un allenamento) entro un'ora da quell'orario.
export async function leggiCalendario(legaId: string, _prev: LetturaCalendario | undefined, formData: FormData): Promise<LetturaCalendario> {
  await requireIn(legaId, 'organizzatore')
  const file = formData.get('file')
  const link = str(formData, 'link')
  let contenuto: string
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > LIMITE_BYTE) return { error: await tr('Il file è troppo grande.') }
      contenuto = await file.text()
    } else if (link) {
      contenuto = await scaricaIcs(link)
    } else {
      return { error: await tr('Scegli un file .ics o incolla il link del calendario.') }
    }
  } catch (e) {
    return {
      error: await tr(
        e instanceof Error && e.message === 'link'
          ? 'Il link non è valido: deve iniziare con https:// o webcal://'
          : 'Non riesco a scaricare il calendario: controlla che il link sia pubblico.',
      ),
    }
  }
  let letti: ReturnType<typeof leggiIcs>
  try {
    letti = leggiIcs(contenuto)
  } catch {
    return { error: await tr('Il file non sembra un calendario (.ics).') }
  }
  if (!letti.eventi.length) return { error: await tr('Nessun evento futuro con un orario in questo calendario.'), tuttoIlGiorno: letti.tuttoIlGiorno }
  const ORA = 3_600_000
  const esistenti = (
    await sanity.fetch<string[]>(`*[_type == "match" && lega._ref == $legaId && coalesce(stato, "aperta") != "annullata" && data >= $da && data <= $a].data`, {
      legaId,
      da: new Date(new Date(letti.eventi[0].inizio).getTime() - ORA).toISOString(),
      a: new Date(new Date(letti.eventi.at(-1)!.inizio).getTime() + ORA).toISOString(),
    })
  ).map((d) => new Date(d).getTime())
  return {
    eventi: letti.eventi.map((e) => ({ ...e, presente: esistenti.some((x) => Math.abs(x - new Date(e.inizio).getTime()) <= ORA) })),
    tuttoIlGiorno: letti.tuttoIlGiorno,
  }
}

// Crea le partite e gli allenamenti scelti tra gli eventi importati, con la stessa finestra di convocazioni per tutti.
export async function importaEventi(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  type Scelto = { inizio: string; fine: string; titolo: string; luogo: string; tipo: 'partita' | 'allenamento' }
  let scelti: Scelto[]
  try {
    scelti = JSON.parse(str(formData, 'eventi'))
  } catch {
    scelti = []
  }
  if (!Array.isArray(scelti) || !scelti.length) return { error: await tr('Scegli almeno un evento da importare.') }
  if (scelti.length > 150) return { error: await tr('Al massimo 150 eventi alla volta.') }

  const intero = (k: string, min: number, max: number, base: number) => {
    const n = num(formData, k)
    return n != null && Number.isInteger(n) && n >= min && n <= max ? n : base
  }
  const giorniPrima = intero('aperturaGiorni', 0, 14, 3)
  const oraApertura = /^\d{2}:\d{2}$/.test(str(formData, 'aperturaOra')) ? str(formData, 'aperturaOra') : '10:00'
  const orePrima = intero('chiusuraOre', 0, 48, 2)
  const postiAllenamento = intero('postiAllenamento', 2, MAX_ALLENAMENTO, 16)
  const quota = num(formData, 'quota')
  if (quota != null && (quota < 0 || quota > 1000)) return { error: await tr('Quota non valida.') }

  const adesso = Math.floor(Date.now() / 60_000) * 60_000
  const lega = { _type: 'reference' as const, _ref: legaId }
  const tx = sanity.transaction()
  let creati = 0
  let primo = ''
  for (const e of scelti) {
    const inizio = new Date(e?.inizio)
    if (Number.isNaN(inizio.getTime()) || inizio.getTime() <= adesso) continue
    const fine = new Date(e.fine)
    const minuti = Number.isNaN(fine.getTime()) ? 60 : Math.round((fine.getTime() - inizio.getTime()) / 60_000)
    const durata = Math.min(300, Math.max(10, minuti || 60))
    // convocazioni: da N giorni prima all'ora scelta (non prima di adesso) fino a N ore prima dell'inizio
    const giorno = isoToRomeLocal(inizio.toISOString()).slice(0, 10)
    const apertura = Math.max(adesso, new Date(romeLocalToISO(`${addDays(giorno, -giorniPrima)}T${oraApertura}`)).getTime())
    if (apertura >= inizio.getTime()) continue
    let chiusura = inizio.getTime() - orePrima * 3_600_000
    if (chiusura <= apertura) chiusura = inizio.getTime()
    const titolo = typeof e.titolo === 'string' ? e.titolo.trim().slice(0, 120) : ''
    const luogo = (typeof e.luogo === 'string' ? e.luogo.trim().slice(0, 120) : '') || titolo || (await tr('Da definire'))
    const allenamento = e.tipo === 'allenamento'
    tx.create({
      _type: 'match',
      lega,
      ...(allenamento && { tipo: 'allenamento' }),
      data: inizio.toISOString(),
      durataMinuti: durata,
      luogo,
      aperturaConvocazioni: new Date(apertura).toISOString(),
      chiusuraConvocazioni: new Date(chiusura).toISOString(),
      durataFinestraMinuti: Math.max(15, Math.round((chiusura - apertura) / 60_000)),
      postiDisponibili: allenamento ? postiAllenamento : MAX_ISCRITTI,
      postiAutomatici: !allenamento,
      ...(quota != null && { quota }),
      ...(titolo && titolo !== luogo && { note: titolo }),
      stato: 'aperta',
      convocazioni: [],
    })
    creati++
    if (!primo || inizio.toISOString() < primo) primo = inizio.toISOString()
  }
  if (!creati) return { error: await tr('Nessun evento importabile: sono già passati o troppo vicini.') }
  await tx.commit()
  revalidatePath('/', 'layout')
  redirect(`/calendario?mese=${isoToRomeLocal(primo).slice(0, 7)}&lega=${legaId}&importati=${creati}`)
}

const STATI: Stato[] = ['aperta', 'chiusa', 'giocata', 'annullata']

export async function cambiaStato(matchId: string, stato: Stato) {
  await requireForDoc(matchId, 'organizzatore')
  if (!STATI.includes(stato)) throw new Error('Stato non valido')
  // Chiudendo: stesse regole di quando si chiudono da sole a tempo scaduto (posti e avviso a chi è in lista).
  if (stato === 'chiusa') {
    await chiudiConvocazioni(matchId)
    return refresh()
  }
  const doc = await sanity.fetch<{ stato?: Stato; postiAutomatici?: boolean; data?: string; chiusuraConvocazioni?: string; aperturaConvocazioni?: string; convocazioni?: (RawConvocazione & { aggiunto?: boolean })[] } | null>(
    `*[_type == "match" && _id == $id][0]{stato, postiAutomatici, data, chiusuraConvocazioni, aperturaConvocazioni, convocazioni}`,
    { id: matchId },
  )
  // partita annullata: il campo prenotato su The Cap torna libero
  if (stato === 'annullata') await liberaPerPartita(matchId).catch(() => undefined)
  const patch = sanity.patch(matchId).set({ stato })

  if (stato === 'aperta' && doc?.stato === 'chiusa') {
    // "In base alle convocazioni": riaprendo si torna al massimo.
    if (doc.postiAutomatici && doc.convocazioni) patch.set({ postiDisponibili: MAX_ISCRITTI, convocazioni: assegnaPosti(doc.convocazioni, MAX_ISCRITTI) })
    // A tempo scaduto si richiuderebbero da sole: la finestra si allunga di un'ora (non oltre l'inizio della partita).
    if (doc.chiusuraConvocazioni && new Date(doc.chiusuraConvocazioni).getTime() <= Date.now() && doc.data) {
      const fine = Math.min(Date.now() + 60 * 60_000, new Date(doc.data).getTime())
      patch.set({
        chiusuraConvocazioni: new Date(fine).toISOString(),
        ...(doc.aperturaConvocazioni && { durataFinestraMinuti: Math.round((fine - new Date(doc.aperturaConvocazioni).getTime()) / 60_000) }),
      })
    }
  }
  await patch.commit()
  refresh()
}

// Formazioni decise dall'organizzatore (a mano o con il bilanciamento automatico),
// solo a convocazioni chiuse: ogni giocatore in lista deve stare in una squadra.
export async function salvaFormazioni(
  matchId: string,
  a: string[],
  b: string[],
  opzioni: { pettorine: 'A' | 'B' | null; avvisa: boolean } = { pettorine: null, avvisa: false },
): Promise<FormState> {
  const { lega } = await requireForDoc(matchId, 'organizzatore')
  const match = await getMatch(matchId)
  // gli allenamenti non hanno squadre
  if (!match || match.tipo === 'allenamento') return { error: await tr('Partita non trovata.') }
  if (match.stato !== 'chiusa') return { error: await tr('Le formazioni si fanno dopo aver chiuso le convocazioni.') }

  const inLista = new Set(presenti(match).map((c) => c.giocatore._id))
  const scelti = [...a, ...b]
  if (new Set(scelti).size !== scelti.length) return { error: await tr('Un giocatore è in tutte e due le squadre.') }
  if (scelti.some((id) => !inLista.has(id))) return { error: await tr('C\u2019è un giocatore che non è in lista.') }
  if (scelti.length !== inLista.size) return { error: await tr('Assegna tutti i giocatori in lista a una squadra.') }
  if (!a.length || !b.length) return { error: await tr('Servono due squadre.') }

  const pettorine = opzioni.pettorine === 'A' || opzioni.pettorine === 'B' ? opzioni.pettorine : null
  const patch = sanity.patch(matchId).set({ squadraA: a.map(ref), squadraB: b.map(ref) })
  if (pettorine) patch.set({ pettorine })
  else patch.unset(['pettorine'])
  if (opzioni.avvisa) patch.set({ formazioniUfficialiIl: new Date().toISOString() })
  await patch.commit()

  // Formazioni ufficiali: ognuno riceve la sua squadra, e chi porta le pettorine il promemoria.
  if (opzioni.avvisa) {
    // Nella lingua di ogni telefono. Chi non ha ancora pagato la quota riceve anche l'invito a pagare con Satispay.
    const pagato = new Set(match.pagamenti.map((p) => p.giocatoreId))
    const messaggio = (squadra: 'A' | 'B', conQuota: boolean) => (t: T) => {
      const quando = `${t.data(match.data, { weekday: 'long', hour: '2-digit', minute: '2-digit' })} · ${match.luogo}`
      const sei = t('Sei nella {squadra}', { squadra: nomeSquadra(squadra, t) })
      const base = `${sei}${pettorine === squadra ? `: ${t('porta la pettorina!')} 🦺` : '.'}\n${quando}`
      const paga = conQuota && match.quota != null ? `\n💶 ${t('Entra nell’app per pagare {quota} € con Satispay', { quota: match.quota })}` : ''
      return {
        title: `⚽ ${lega.nome}: ${match.formazioniUfficialiIl ? t('formazioni aggiornate') : t('formazioni pronte!')}`,
        body: base + paga,
        url: `/partite/${matchId}`,
        tag: `formazioni-${matchId}`,
      }
    }
    const invii = (['A', 'B'] as const).flatMap((squadra) => {
      const ids = squadra === 'A' ? a : b
      return [
        [ids.filter((id) => pagato.has(id)), messaggio(squadra, false)],
        [ids.filter((id) => !pagato.has(id)), messaggio(squadra, true)],
      ] as const
    })
    await Promise.all(invii.map(([ids, testo]) => inviaAGiocatori([...ids], testo, 'formazioni')))
  }
  redirect(`/partite/${matchId}`)
}

// Ritocchi alle squadre già fatte (organizzatori, a convocazioni chiuse; nei tornei valgono solo per quella partita).
type SquadreRaw = {
  _rev: string
  stato: Stato
  torneo?: unknown
  postiDisponibili: number
  convocazioni?: (RawConvocazione & { aggiunto?: boolean })[]
  squadraA?: { _key: string; _ref: string }[]
  squadraB?: { _key: string; _ref: string }[]
}

async function ritoccaSquadre(matchId: string, cambia: (doc: SquadreRaw) => Record<string, unknown> | null, anche: Stato[] = []) {
  await requireForDoc(matchId, 'organizzatore')
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await sanity.fetch<SquadreRaw | null>(
      `*[_type == "match" && _id == $id][0]{_rev, stato, torneo, postiDisponibili, convocazioni, squadraA, squadraB}`,
      { id: matchId },
    )
    if (!doc) throw new Error('Partita non trovata')
    if (doc.stato !== 'chiusa' && !anche.includes(doc.stato)) throw new Error('Le squadre di questa partita non si possono modificare')
    const set = cambia(doc)
    if (!set) return
    try {
      await sanity.patch(matchId).ifRevisionId(doc._rev).set(set).commit()
      refresh()
      return
    } catch (err) {
      if (attempt === 2) throw err
    }
  }
}

// Sposta un giocatore in lista nella squadra A o B (anche chi non era ancora in nessuna).
export async function cambiaSquadra(matchId: string, giocatoreId: string, verso: 'A' | 'B') {
  await ritoccaSquadre(matchId, (doc) => {
    const inLista = doc.convocazioni?.some((c) => c.giocatore?._ref === giocatoreId && c.risposta === 'presente')
    if (!inLista) return null
    const senza = (s?: { _key: string; _ref: string }[]) => (s ?? []).filter((r) => r._ref !== giocatoreId)
    const [a, b] = [senza(doc.squadraA), senza(doc.squadraB)]
    ;(verso === 'A' ? a : b).push(ref(giocatoreId))
    return { squadraA: a, squadraB: b }
  })
}

// Toglie un giocatore dalla partita: esce dalla sua squadra e passa tra i "non ci sono".
// Se c'è qualcuno in lista d'attesa, sale in lista (senza squadra: l'organizzatore lo mette dove vuole).
export async function togliDallaPartita(matchId: string, giocatoreId: string) {
  await ritoccaSquadre(matchId, (doc) => {
    const list = (doc.convocazioni ?? []).map((c) =>
      c.giocatore?._ref === giocatoreId ? { ...c, risposta: 'assente' as Risposta, aggiunto: false } : c,
    )
    const senza = (s?: { _key: string; _ref: string }[]) => (s ?? []).filter((r) => r._ref !== giocatoreId)
    return { convocazioni: assegnaPosti(list, doc.postiDisponibili), squadraA: senza(doc.squadraA), squadraB: senza(doc.squadraB) }
    // anche a convocazioni aperte ("Escludi" dalla lista o dalla lista d'attesa)
  }, ['aperta'])
}

// Pro: l'organizzatore approva (o scarta) la proposta di nuovi voti per un giocatore. La proposta si ricalcola qui,
// così vale quella aggiornata; in tutti e due i casi la prossima guarda solo le partite giocate dopo.
export async function decidiProposta(giocatoreId: string, approva: boolean) {
  const admin = await requireForDoc(giocatoreId, 'organizzatore')
  if (!(await ioPro(admin.lega._id))) throw new Error('Funzione della versione Pro')
  const proposta = (await formaDellaLega(admin.lega._id)).proposte.find((p) => p.giocatoreId === giocatoreId)
  if (!proposta) return refresh()
  const patch = sanity.patch(giocatoreId).set({ revisioneIl: proposta.fino })
  if (approva) {
    // i voti di partenza si fissano alla prima proposta approvata (per mostrare il miglioramento)
    const prima = await sanity.fetch<Player['caratteristiche'] | null>(`*[_id == $id][0].caratteristiche`, { id: giocatoreId })
    patch.setIfMissing({ caratteristiche: {}, caratteristicheBase: prima ?? {} })
    for (const [k, m] of Object.entries(proposta.modifiche)) patch.set({ [`caratteristiche.${k}`]: m.a })
  }
  await patch.commit()
  refresh()
}

// Rimette un giocatore tra quelli da allocare: esce dalla sua squadra ma resta in lista.
export async function togliDallaSquadra(matchId: string, giocatoreId: string) {
  await ritoccaSquadre(matchId, (doc) => {
    const senza = (s?: { _key: string; _ref: string }[]) => (s ?? []).filter((r) => r._ref !== giocatoreId)
    return { squadraA: senza(doc.squadraA), squadraB: senza(doc.squadraB) }
  })
}

// Risultato, marcatori e MVP: dopo la fine della partita, per organizzatori e refertatori.
// Il punteggio di ogni squadra è la somma dei gol dei suoi giocatori più autogol/altri.
export async function salvaRisultato(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireForDoc(matchId, 'refertatore')
  const match = await getMatch(matchId)
  if (!match) return { error: await tr('Partita non trovata.') }
  if (match.stato === 'annullata') return { error: await tr('La partita è annullata.') }
  if (new Date() < risultatoDa(match)) return { error: await tr('La partita non è ancora finita.') }
  if (!match.squadraA.length || !match.squadraB.length) return { error: await tr('Prima vanno fatte le squadre.') }

  const golDi = (id: string) => {
    const n = num(formData, `gol_${id}`) ?? 0
    return Number.isInteger(n) && n > 0 && n < 100 ? n : 0
  }
  const autogol = (k: string) => {
    const n = num(formData, k) ?? 0
    return Number.isInteger(n) && n > 0 && n < 100 ? n : 0
  }
  const marcatori = [...match.squadraA, ...match.squadraB]
    .map((p) => ({ id: p._id, gol: golDi(p._id) }))
    .filter((m) => m.gol > 0)
  const somma = (squadra: typeof match.squadraA) => squadra.reduce((t, p) => t + golDi(p._id), 0)
  const autogolA = autogol('autogolA')
  const autogolB = autogol('autogolB')
  const golA = somma(match.squadraA) + autogolA
  const golB = somma(match.squadraB) + autogolB

  const mvp = str(formData, 'mvp')
  const inCampo = new Set([...match.squadraA, ...match.squadraB].map((p) => p._id))
  if (mvp && !inCampo.has(mvp)) return { error: await tr('L\u2019MVP deve essere uno dei giocatori in campo.') }

  // Tabellone: in caso di pareggio bisogna dire chi passa il turno (es. ai rigori).
  const eliminazione = match.torneo?.formato === 'eliminazione' || match.fase === 'eliminazione'
  const passa = str(formData, 'passa')
  if (eliminazione && golA === golB && passa !== 'A' && passa !== 'B') return { error: await tr('È finita in pareggio: scegli chi passa il turno.') }

  const patch = sanity.patch(matchId).set({
    ...(eliminazione && golA === golB && { passa }),
    risultato: { golA, golB },
    autogolA,
    autogolB,
    marcatori: marcatori.map((m) => ({ _key: m.id, _type: 'marcatore', giocatore: { _type: 'reference', _ref: m.id }, gol: m.gol })),
    stato: 'giocata',
  })
  if (mvp) patch.set({ mvp: { _type: 'reference', _ref: mvp } })
  else patch.unset(['mvp'])
  if (!(eliminazione && golA === golB)) patch.unset(['passa'])
  await patch.commit()
  // Tabellone: con il vincitore si crea (se si può) la partita del turno dopo.
  if (match.torneo && match.torneo.formato !== 'girone') await aggiornaTabellone(match.torneo._id)
  await avvisaProposte(match).catch(() => undefined)
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/partite/${matchId}`)
}

// Pro: quando un giocatore di questa partita arriva a PARTITE_PER_REVISIONE partite dall'ultima revisione
// dei suoi voti, gli organizzatori con Pro ricevono un avviso con le proposte da rivedere.
async function avvisaProposte(match: Match) {
  if (!(await legaPro(match.legaId))) return
  const inCampo = new Set([...match.squadraA, ...match.squadraB].map((p) => p._id))
  const { proposte } = await formaDellaLega(match.legaId)
  if (!proposte.some((p) => inCampo.has(p.giocatoreId) && p.partite % PARTITE_PER_REVISIONE === 0)) return
  const organizzatori = await organizzatoriPro(match.legaId)
  await inviaAGiocatori(organizzatori, (t) => ({
    title: `📈 ${t('Nuove proposte di voto')}${match.legaNome ? ` · ${match.legaNome}` : ''}`,
    body: t.n(proposte.length, '{n} giocatore da rivedere: approva o scarta i nuovi voti.', '{n} giocatori da rivedere: approva o scarta i nuovi voti.'),
    url: '/giocatori/proposte',
    tag: `proposte-${match.legaId}`,
  }))
}

// ---------- Partite ricorrenti (organizzatori) ----------

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/

export async function salvaSerie(seriesId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireForDoc(seriesId, 'organizzatore')
  const current = await getSeries(seriesId)
  if (!current) return { error: await tr('Serie non trovata.') }

  const ora = str(formData, 'ora')
  const aperturaOra = str(formData, 'aperturaOra')
  const aperturaGiorniPrima = num(formData, 'aperturaGiorniPrima') ?? 0
  const durataFinestra = Math.max(15, Math.round(num(formData, 'durataFinestraMinuti') ?? 120))
  const luogo = str(formData, 'luogo')
  const posti = num(formData, 'postiDisponibili') ?? 10
  const quota = num(formData, 'quota')
  const note = str(formData, 'note')
  const fineData = str(formData, 'fineData')

  if (!luogo || ![ora, aperturaOra].every((o) => ORA.test(o))) return { error: await tr('Controlla luogo e orari.') }
  const automatici = formData.get('postiAutomatici') === 'on'
  // allenamenti ricorrenti: più posti, niente formati da partita
  const massimo = current?.tipo === 'allenamento' ? MAX_ALLENAMENTO : MAX_GIOCATORI
  if (!automatici && (!Number.isInteger(posti) || posti < 2 || posti > massimo)) return { error: await tr('Da 2 a {n} giocatori.', { n: massimo }) }
  // Confronto in minuti rispetto all'inizio della partita.
  const minutiPrima = (giorni: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const [ph, pm] = ora.split(':').map(Number)
    return giorni * 1440 + (ph * 60 + pm) - (h * 60 + m)
  }
  const aperturaMinutiPrima = minutiPrima(aperturaGiorniPrima, aperturaOra)
  if (aperturaMinutiPrima <= 0) return { error: await tr('Le convocazioni devono aprirsi prima della partita.') }
  // Chiusura = apertura + durata, al massimo all'inizio della partita; in "giorni prima" e "ora".
  const chiusuraMinuti = (() => {
    const [ph, pm] = ora.split(':').map(Number)
    return ph * 60 + pm - Math.max(0, aperturaMinutiPrima - durataFinestra) // minuti dalla mezzanotte del giorno partita
  })()
  const chiusuraGiorniPrima = -Math.floor(chiusuraMinuti / 1440)
  const minutoDelGiorno = chiusuraMinuti + chiusuraGiorniPrima * 1440
  const chiusuraOra = `${String(Math.floor(minutoDelGiorno / 60)).padStart(2, '0')}:${String(minutoDelGiorno % 60).padStart(2, '0')}`

  const durata = num(formData, 'durataMinuti') ?? 60
  if (!Number.isInteger(durata) || durata < 10 || durata > 300) return { error: await tr('Durata non valida (10-300 minuti).') }

  const fields = {
    ora,
    durataMinuti: durata,
    luogo,
    postiDisponibili: automatici ? MAX_ISCRITTI : posti,
    postiAutomatici: automatici,
    ogniSettimane: num(formData, 'ogniSettimane') === 2 ? 2 : 1,
    aperturaGiorniPrima,
    aperturaOra,
    chiusuraGiorniPrima,
    chiusuraOra,
    durataFinestraMinuti: durataFinestra,
  }
  const optional = { quota, note: note || undefined, fineData: fineData || undefined, campo: leggiCampo(formData.get('campo')) ?? undefined }
  await sanity
    .patch(seriesId)
    .set({ ...fields, ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)) })
    .unset(Object.entries(optional).filter(([, v]) => v === undefined).map(([k]) => k))
    .commit()

  await rimuoviFutureVuote(seriesId)
  if (current.attiva !== false) await assicuraRicorrenze({ serie: { ...current, ...fields, ...optional } })
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect('/partite/ricorrenti')
}

export async function attivaSerie(seriesId: string, attiva: boolean) {
  await requireForDoc(seriesId, 'organizzatore')
  await sanity.patch(seriesId).set({ attiva }).commit()
  if (attiva) {
    const serie = await getSeries(seriesId)
    if (serie) await assicuraRicorrenze({ serie })
  } else {
    await rimuoviFutureVuote(seriesId)
  }
  refresh()
}

// ---------- Giocatori (organizzatori) ----------

const MAX_FOTO = 4 * 1024 * 1024

async function uploadFoto(foto: FormDataEntryValue | null) {
  if (!(foto instanceof File) || foto.size === 0) return undefined
  if (!foto.type.startsWith('image/')) return { error: await tr('La foto deve essere un\u2019immagine.') }
  if (foto.size > MAX_FOTO) return { error: await tr('La foto è troppo grande (max 4 MB).') }
  const asset = await sanity.assets.upload('image', Buffer.from(await foto.arrayBuffer()), {
    filename: foto.name,
    contentType: foto.type,
  })
  return { foto: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } }
}

// I file delle immagini su Sanity sono visibili a chiunque abbia il link, anche col dataset privato:
// una foto tolta o sostituita si cancella davvero (GDPR), se nessuna scheda la usa più e non è
// la foto profilo dell'account `profiloDi` (che va nelle schede delle leghe in cui si entra dopo).
async function cancellaFotoInutili(ids: (string | null | undefined)[], profiloDi?: string | null) {
  try {
    let tenere: string | undefined
    if (profiloDi) {
      const { clerkClient } = await import('@clerk/nextjs/server')
      const utente = await (await clerkClient()).users.getUser(profiloDi).catch(() => null)
      tenere = (utente?.privateMetadata as { fotoAsset?: string } | undefined)?.fotoAsset
    }
    for (const id of new Set(ids)) {
      if (!id || id === tenere) continue
      if (await sanity.fetch<number>(`count(*[references($id)])`, { id })) continue
      await sanity.delete(id)
    }
  } catch {
    // al massimo resta un file inutilizzato: non blocca il salvataggio
  }
}

const fotoDellaScheda = (id: string) =>
  sanity.fetch<{ vecchia?: string; clerkUserId?: string } | null>(`*[_id == $id][0]{"vecchia": foto.asset._ref, clerkUserId}`, { id })

const badgeFromForm = (formData: FormData) => {
  const b = str(formData, 'badge')
  return b in BADGE ? b : undefined
}

const caratteristicheFromForm = (formData: FormData) =>
  Object.fromEntries(
    (Object.keys(SKILLS) as Skill[]).map((k) => [k, Math.min(10, Math.max(1, passoVoto(num(formData, k) ?? 5)))]),
  )

// Cambio rapido della foto cliccando sull'avatar: ognuno la sua, gli organizzatori quella di tutti.
export async function caricaFoto(playerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireForDoc(playerId)
  if (me._id !== playerId && !me.isAdmin) return { error: await tr('Puoi cambiare solo la tua foto.') }
  const upload = await uploadFoto(formData.get('foto'))
  if (!upload) return { error: await tr('Nessuna foto selezionata.') }
  if ('error' in upload) return upload
  const prima = await fotoDellaScheda(playerId)
  await sanity.patch(playerId).set({ foto: upload.foto }).commit()
  await cancellaFotoInutili([prima?.vecchia], prima?.clerkUserId)
  refresh()
}

export async function salvaGiocatore(playerId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  // Nuovo giocatore: nella lega attiva. Modifica: nella lega del giocatore.
  const admin = playerId ? await requireForDoc(playerId, 'organizzatore') : await requireAdmin()

  const nome = str(formData, 'nome')
  const email = str(formData, 'email').toLowerCase()
  const telefono = normalizzaTelefono(str(formData, 'telefono'))
  if (!nome) return { error: await tr('Il nome è obbligatorio.') }
  if (!email && !telefono) return { error: await tr('Serve l\u2019email o il numero di telefono, per collegarlo quando fa l\u2019accesso.') }
  // pagina di modifica rimasta indietro (es. tornando indietro): non sovrascrive quello che è cambiato nel frattempo
  const rev = str(formData, 'rev')
  if (playerId && rev) {
    const attuale = await sanity.fetch<string | null>(`*[_id == $id][0]._rev`, { id: playerId })
    if (attuale && attuale !== rev) return { error: await tr('La scheda è stata modificata nel frattempo: ricarica la pagina e rifai la modifica.') }
  }
  if (telefono && !/^\+\d{8,15}$/.test(telefono)) return { error: await tr('Numero di telefono non valido (es. 333 1234567 o +39 333 1234567).') }

  const duplicate = await sanity.fetch<string | null>(
    `*[_type == "player" && lega._ref == $lega && _id != $id && ((defined(email) && lower(email) == $email) || (defined(telefono) && telefono == $telefono))][0].nome`,
    { email: email || '-', telefono: telefono || '-', id: playerId ?? '', lega: admin.lega._id },
  )
  if (duplicate) return { error: await tr('Email o telefono già usati da {nome}.', { nome: duplicate }) }

  const upload = await uploadFoto(formData.get('foto'))
  if (upload && 'error' in upload) return upload
  const fotoField = upload?.foto

  const ruolo = str(formData, 'ruolo')
  const piede = str(formData, 'piede')
  // numero di maglia: facoltativo, da 0 a 99, unico tra i giocatori attivi della lega
  const numeroTesto = str(formData, 'numero')
  const numero = numeroTesto === '' ? undefined : Number(numeroTesto)
  if (numero !== undefined && (!Number.isInteger(numero) || numero < 0 || numero > 99)) return { error: await tr('Il numero di maglia va da 0 a 99.') }
  if (numero !== undefined) {
    const gia = await sanity.fetch<string | null>(
      `*[_type == "player" && lega._ref == $lega && _id != $id && attivo != false && numero == $numero][0].nome`,
      { lega: admin.lega._id, id: playerId ?? '', numero },
    )
    if (gia) return { error: await tr('Il numero {n} è già di {nome}.', { n: numero, nome: gia }) }
  }
  const optional = {
    numero,
    email: email || undefined,
    telefono: telefono || undefined,
    cognome: str(formData, 'cognome') || undefined,
    soprannome: str(formData, 'soprannome') || undefined,
    ruolo: leggiRuolo(ruolo, admin.lega.club) || undefined,
    piede: (PIEDI as readonly string[]).includes(piede) ? piede : undefined,
    badge: badgeFromForm(formData),
    foto: fotoField,
  }
  const fields = {
    nome,
    // Un organizzatore non può togliersi da solo i permessi e restare chiuso fuori.
    isAdmin: playerId === admin._id || formData.get('isAdmin') === 'on',
    puoInserireRisultati: formData.get('puoInserireRisultati') === 'on',
    attivo: formData.get('attivo') === 'on',
    caratteristiche: caratteristicheFromForm(formData),
    ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)),
  }

  let id = playerId
  if (id) {
    const toUnset = Object.entries(optional)
      .filter(([k, v]) => v === undefined && (k !== 'foto' || formData.get('rimuoviFoto') === 'on'))
      .map(([k]) => k)
    // voti cambiati a mano: diventano i nuovi voti di partenza (sparisce il miglioramento in viola)
    const prima = await sanity.fetch<Player['caratteristiche'] | null>(`*[_id == $id][0].caratteristiche`, { id })
    if (Object.keys(SKILLS).some((k) => (prima?.[k as Skill] ?? 5) !== fields.caratteristiche[k as Skill])) toUnset.push('caratteristicheBase')
    const fotoPrima = fotoField || toUnset.includes('foto') ? await fotoDellaScheda(id) : null
    await sanity.patch(id).set(fields).unset(toUnset).commit()
    if (fotoPrima) await cancellaFotoInutili([fotoPrima.vecchia], fotoPrima.clerkUserId)
  } else {
    id = (await sanity.create({ _type: 'player', lega: { _type: 'reference', _ref: admin.lega._id }, ...fields }))._id
  }
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/giocatori/${id}`)
}

// ---------- Notifiche ----------

export async function attivaNotifiche(sub: PushSub, dispositivo: string) {
  const utente = await getUtente()
  if (!utente) throw new Error('Accesso richiesto')
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error('Iscrizione non valida')
  await salvaIscrizione(utente.id, sub, dispositivo, await getLingua())
}

// App iPhone/Android: salva il token Firebase del telefono (anche quando Firebase lo rinnova).
export async function attivaNotificheNative(token: string, tipo: 'ios' | 'android', dispositivo: string) {
  const utente = await getUtente()
  if (!utente) return
  if (!token || token.length > 4096 || (tipo !== 'ios' && tipo !== 'android')) throw new Error('Token non valido')
  await salvaTokenNativo(utente.id, token, tipo, dispositivo, await getLingua())
}

export async function disattivaNotifiche(endpoint: string) {
  const utente = await getUtente()
  if (!utente) throw new Error('Accesso richiesto')
  await rimuoviIscrizione(utente.id, endpoint)
}

// L'organizzatore allunga la finestra delle convocazioni (al massimo fino all'inizio della partita).
export async function allungaFinestra(matchId: string, minuti: number) {
  await requireForDoc(matchId, 'organizzatore')
  const match = await getMatch(matchId)
  if (!match) throw new Error('Partita non trovata')
  if (match.stato !== 'aperta') throw new Error('Le convocazioni sono chiuse')
  const inizio = new Date(match.data).getTime()
  // Se il tempo era già scaduto, si allunga a partire da adesso.
  const base = Math.max(new Date(match.chiusuraConvocazioni).getTime(), Date.now())
  const fine = Math.min(base + Math.max(15, minuti) * 60_000, inizio)
  await sanity
    .patch(matchId)
    .set({
      chiusuraConvocazioni: new Date(fine).toISOString(),
      durataFinestraMinuti: Math.round((fine - new Date(match.aperturaConvocazioni).getTime()) / 60_000),
    })
    .commit()
  refresh()
}

export type AvvisoState = { inviate?: number; totali?: number; error?: string } | undefined

// Apre subito le convocazioni (se non lo sono già per orario) e avvisa tutti.
export async function apriConvocazioni(matchId: string): Promise<AvvisoState> {
  const { lega } = await requireForDoc(matchId, 'organizzatore')
  const match = await getMatch(matchId)
  if (!match) return { error: await tr('Partita non trovata.') }
  const stato = finestra(match)
  if (stato === 'chiusa' || stato === 'scaduta') return { error: await tr('Le convocazioni sono chiuse: modifica l\u2019orario di chiusura.') }

  const now = new Date().toISOString()
  // Aprendo prima dell'orario previsto, la finestra parte adesso e dura quanto impostato.
  const fine = new Date(Math.min(Date.now() + (match.durataFinestraMinuti ?? 120) * 60_000, new Date(match.data).getTime())).toISOString()
  await sanity
    .patch(matchId)
    .set({ notificaInviataIl: now, ...(stato === 'non_ancora' && { aperturaConvocazioni: now, chiusuraConvocazioni: fine }) })
    .commit()

  const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const
  const chiusura = stato === 'non_ancora' ? fine : match.chiusuraConvocazioni
  // Prima volta: "Convocazioni aperte" con i dettagli; con le convocazioni già aperte ("Avvisa di nuovo"): il sollecito.
  const messaggio = (t: T) =>
      stato === 'aperta'
        ? {
            title: `📣 ${t('SOLLECITO CONVOCAZIONI')} – ${convocati(match, t)}`,
            body: `${lega.nome} · ${t.data(match.data, breve)} · ${match.luogo}\n${t('Rispondi entro {data}', { data: t.data(chiusura, breve) })}`,
            url: `/partite/${matchId}`,
            tag: matchId,
          }
        : {
            title: match.tipo === 'allenamento' ? `🏃 ${t('Allenamento')} · ${t('Convocazioni aperte')}` : `⚽ ${t('Convocazioni aperte')}`,
            body: `${lega.nome} · ${t.data(match.data, breve)} · ${match.luogo}\n${
              match.postiAutomatici ? t('Rispondi entro {data}', { data: t.data(chiusura, breve) }) : t('{n} posti, rispondi entro {data}', { n: match.postiDisponibili, data: t.data(chiusura, breve) })
            }`,
            url: `/partite/${matchId}`,
            tag: matchId,
          }
  // leghe "Squadra": l'avviso va solo ai convocati dall'allenatore, non a tutta la rosa
  const risultato = conSelezione(match)
    ? await inviaAGiocatori(match.convocati ?? [], messaggio, 'convocazioni')
    : await inviaATutti(match.legaId, messaggio, 'convocazioni')
  refresh()
  return risultato
}

// ---------- Leghe ----------

// Codici facili da dettare: niente 0/O, 1/I.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function nuovoCodice() {
  for (;;) {
    const codice = Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
    const esiste = await sanity.fetch<number>(`count(*[_type in ["league", "tournament"] && codiceInvito == $codice])`, { codice })
    if (!esiste) return codice
  }
}

async function attivaLega(legaId: string) {
  ;(await cookies()).set(COOKIE_LEGA, legaId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true })
}

// La mia scheda in una lega, creata a partire dal mio account.
async function nuovaScheda(legaId: string, utente: NonNullable<Awaited<ReturnType<typeof getUtente>>>, isAdmin: boolean) {
  await sanity.createIfNotExists({
    // ID fisso: toccare due volte "entra" non crea due schede
    _id: `player-${legaId}-${utente.id}`,
    _type: 'player',
    lega: { _type: 'reference', _ref: legaId },
    nome: utente.nome || utente.emails[0]?.split('@')[0] || 'Giocatore',
    ...(utente.cognome && { cognome: utente.cognome }),
    ...(utente.emails[0] && { email: utente.emails[0] }),
    ...((utente.telefono || utente.telefoni[0]) && { telefono: utente.telefono || utente.telefoni[0] }),
    ...(utente.ruolo && { ruolo: utente.ruolo }),
    ...(utente.piede && { piede: utente.piede }),
    ...(utente.dataNascita && { dataNascita: utente.dataNascita }),
    ...(utente.fotoAsset && { foto: { _type: 'image', asset: { _type: 'reference', _ref: utente.fotoAsset } } }),
    clerkUserId: utente.id,
    isAdmin,
    attivo: true,
    caratteristiche: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 5])),
  })
}

export type EsitoNuovaLega = { error?: string } | undefined

// Nuova lega (con la città facoltativa per il meteo): chi la crea è organizzatore.
// Creata la lega, si apre: in home c'è l'invito da mandare agli amici.
export async function creaLega(_prev: EsitoNuovaLega, formData: FormData): Promise<EsitoNuovaLega> {
  const utente = await getUtente()
  if (!utente) return { error: await tr('Accesso richiesto.') }
  const nome = str(formData, 'nome')
  if (nome.length < 2 || nome.length > 40) return { error: await tr('Il nome deve avere tra 2 e 40 caratteri.') }
  const cittaScritta = str(formData, 'citta')
  const citta = cittaScritta ? await cercaCitta(cittaScritta) : null
  if (cittaScritta && !citta) return { error: await tr('Non trovo la città “{citta}”: prova a scriverla in un altro modo, o lasciala vuota.', { citta: cittaScritta }) }

  const codiceInvito = await nuovoCodice()
  const lega = await sanity.create({ _type: 'league', nome, codiceInvito, creataDa: utente.id, ...(citta && { citta }) })
  await nuovaScheda(lega._id, utente, true)
  await attivaLega(lega._id)
  // Club Allenatore: con il Club già attivo (o per il titolare) la lega nasce Club; altrimenti si apre la pagina
  // del Club PRO per attivarlo (intanto la lega è tra amici: si può passare al Club anche dopo, dalle impostazioni)
  if (str(formData, 'tipo') === 'club') {
    const [titolare, club] = await Promise.all([isTitolare(), mioClub(utente.id)])
    if (!titolare && !club) redirect(`/club?lega=${lega._id}`)
    if (!titolare && (await legheClubOccupate(utente.id, lega._id)) >= MAX_LEGHE_CLUB) redirect(`/club?lega=${lega._id}`)
    await sanity
      .patch(lega._id)
      .set({ club: true, tipo: 'squadra', ...(titolare ? {} : { clubDi: utente.id }) })
      .commit()
  }
  redirect('/')
}

// Entrare con il link d'invito: chi ce l'ha entra subito nella rosa.
export async function uniscitiConInvito(codice: string) {
  await entraConInvito(codice, await getUtente())
}

type Utente = Awaited<ReturnType<typeof getUtente>>

// `utente`: i miei dati (appena salvati, se arrivo da "Completa il tuo profilo").
async function entraConInvito(codice: string, utente: Utente) {
  if (!utente) redirect('/sign-in')
  const lega = await sanity.fetch<{ _id: string } | null>(`*[_type == "league" && codiceInvito == $codice][0]{_id}`, {
    codice: codice.toUpperCase(),
  })
  if (!lega) throw new Error('Invito non valido o scaduto')

  // (non basta membroDi: per il titolare risponde anche da ospite, ma qui deve diventare giocatore)
  if (!(await getMemberships()).some((m) => m.lega._id === lega._id)) {
    // Chi era stato tolto dalla rosa e riceve di nuovo l'invito, rientra con la sua scheda.
    const vecchia = await sanity.fetch<string | null>(
      `*[_type == "player" && lega._ref == $lega && clerkUserId == $id][0]._id`,
      { lega: lega._id, id: utente.id },
    )
    if (vecchia) await sanity.patch(vecchia).set({ attivo: true }).unset(['rimossoIl']).commit()
    else await nuovaScheda(lega._id, utente, false)
  }
  await attivaLega(lega._id)
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function uniscitiConCodice(_prev: FormState, formData: FormData): Promise<FormState> {
  const codice = str(formData, 'codice').toUpperCase().replace(/[^A-Z0-9]/g, '')
  // il codice di una lega, di un torneo (si sceglie la squadra) o di una squadra di un torneo
  const tipo = await sanity.fetch<string | null>(
    `coalesce(*[_type in ["league", "tournament"] && codiceInvito == $codice][0]._type, select(count(*[_type == "tournament" && $codice in squadre[].codiceInvito]) > 0 => "squadra"))`,
    { codice },
  )
  if (tipo === 'tournament') redirect(`/invito-torneo/${codice}`)
  if (tipo === 'squadra') redirect(`/invito-squadra/${codice}`)
  if (tipo !== 'league') return { error: await tr('Codice non valido: controlla di averlo scritto bene.') }
  await uniscitiConInvito(codice)
}

// Super admin: il titolare dell'app entra come giocatore (e organizzatore) in una lega non sua.
export async function aggiungimiAllaLega(legaId: string) {
  const utente = await getUtente()
  if (!utente || !(await isTitolare())) throw new Error('Solo il titolare dell\u2019app può farlo')
  const lega = await sanity.fetch<string | null>(`*[_type == "league" && _id == $legaId][0]._id`, { legaId })
  if (!lega) throw new Error('Lega non trovata')
  if (!(await getMemberships()).some((m) => m.lega._id === legaId)) {
    const vecchia = await sanity.fetch<string | null>(`*[_type == "player" && lega._ref == $lega && clerkUserId == $id][0]._id`, {
      lega: legaId,
      id: utente.id,
    })
    if (vecchia) await sanity.patch(vecchia).set({ attivo: true, isAdmin: true }).unset(['rimossoIl']).commit()
    else await nuovaScheda(legaId, utente, true)
  }
  await attivaLega(legaId)
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect('/')
}

// Km da Apple Salute / Health Connect: il consenso (o la revoca) si registra con la data.
// Consenso ai km da Salute dato o revocato, con la data. Alla revoca si sceglie cosa fare dei km già presi
// da Salute: cancellarli da tutte le partite o tenerli (scelta registrata, per poterla dimostrare).
export async function registraConsensoKm(si: boolean, passati?: 'cancellati' | 'tenuti') {
  const utente = await getUtente()
  if (!utente) return
  const { clerkClient } = await import('@clerk/nextjs/server')
  await (await clerkClient()).users.updateUserMetadata(utente.id, {
    privateMetadata: { consensi: { ...utente.consensi, km: { si, il: new Date().toISOString(), ...(!si && passati && { passati }) } } },
  })
  if (si || passati !== 'cancellati') return
  const schede = await sanity.fetch<string[]>(`*[_type == "player" && clerkUserId == $id]._id`, { id: utente.id })
  const partite = await sanity.fetch<string[]>(`*[_type == "match" && count(distanze[_key in $schede && fonte == "salute"]) > 0]._id`, { schede })
  if (partite.length) {
    const tx = sanity.transaction()
    for (const id of partite) tx.patch(id, (p) => p.unset(schede.map((s) => `distanze[_key == ${JSON.stringify(s)}]`)))
    await tx.commit()
  }
  refresh()
}

// La lingua dell'app su questo dispositivo (e per le notifiche dei miei dispositivi). `vai`: dove tornare dopo.
export async function scegliLingua(lingua: string, vai?: string) {
  if (!isLingua(lingua)) throw new Error('Lingua non valida')
  ;(await cookies()).set(COOKIE_LINGUA, lingua, { path: '/', maxAge: 60 * 60 * 24 * 365 * 2, sameSite: 'lax' })
  const utente = await getUtente()
  if (utente) {
    const ids = await sanity.fetch<string[]>(`*[_type == "pushSubscription" && clerkUserId == $id]._id`, { id: utente.id })
    if (ids.length) {
      const tx = sanity.transaction()
      for (const id of ids) tx.patch(id, (p) => p.set({ lingua }))
      await tx.commit()
    }
  }
  if (vai) redirect(vai.startsWith('/') && !vai.startsWith('//') ? vai : '/')
  refresh()
}

// Cambia la lega attiva su questo dispositivo.
export async function scegliLega(legaId: string, vai = '/') {
  if (!(await membroDi(legaId))) throw new Error('Non fai parte di questa lega')
  await attivaLega(legaId)
  redirect(vai.startsWith('/') ? vai : '/')
}

// ---------- Club: leghe "Squadra" con allenatore ----------

// "Club Allenatore" scelto nel tipo di lega: con il Club già attivo (o per il titolare) la lega diventa una squadra
// con allenatore; altrimenti si va al pagamento, e dopo l'acquisto si torna qui con il Club acceso.
export async function scegliClub(legaId: string) {
  await requireIn(legaId, 'organizzatore')
  const utente = await getUtente()
  if (!utente) redirect('/sign-in')
  const [titolare, club] = await Promise.all([isTitolare(), mioClub(utente.id)])
  if (!titolare && !club) redirect(`/club?lega=${legaId}`)
  // il Club vale al massimo in MAX_LEGHE_CLUB leghe: oltre, la pagina del Club spiega come spostarlo
  if (!titolare && (await legheClubOccupate(utente.id, legaId)) >= MAX_LEGHE_CLUB) redirect(`/club?lega=${legaId}`)
  await sanity
    .patch(legaId)
    .set({ club: true, tipo: 'squadra', ...(titolare ? {} : { clubDi: utente.id }) })
    .commit()
  revalidatePath('/', 'layout')
}

// Dopo l'acquisto del Club nell'app: si verifica l'abbonamento e si accende il Club nella lega scelta.
export async function aggiornaClub(legaId: string | null): Promise<FormState> {
  const utente = await getUtente()
  if (!utente) return { error: await tr('Devi aver fatto l’accesso.') }
  try {
    await sincronizzaAbbonamento(utente.id, utente.emails[0])
  } catch {
    return { error: await tr('Non riesco a verificare l’abbonamento. Riprova tra qualche minuto.') }
  }
  if (legaId && (await mioClub(utente.id))) {
    await requireIn(legaId, 'organizzatore')
    if ((await legheClubOccupate(utente.id, legaId)) >= MAX_LEGHE_CLUB) {
      return { error: await tr('Il tuo Club PRO è già attivo in {n} leghe: rimetti una lega “tra amici” per spostarlo qui.', { n: MAX_LEGHE_CLUB }) }
    }
    await sanity.patch(legaId).set({ club: true, tipo: 'squadra', clubDi: utente.id }).commit()
  }
  revalidatePath('/', 'layout')
}

// ---------- Stagioni ----------

// Termina la stagione in corso: si salva il periodo (dalla fine della precedente a adesso) con il nome scelto,
// es. "2025/26". Niente si cancella: classifica, statistiche e rosa ripartono da zero e la stagione chiusa
// resta consultabile nelle Statistiche.
export async function terminaStagione(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireIn(legaId, 'organizzatore')
  const nome = str(formData, 'nome').slice(0, 30)
  if (!nome) return { error: await tr('Dai un nome alla stagione (es. 2025/26).') }
  const stagioni = admin.lega.stagioni ?? []
  if (stagioni.some((s) => s.nome.toLowerCase() === nome.toLowerCase())) return { error: await tr('C’è già una stagione con questo nome.') }
  const { dal } = periodoInCorso(stagioni)
  const al = new Date().toISOString()
  // una stagione senza nessuna partita non ha senso: si evita di chiuderne una vuota per sbaglio
  const partite = await sanity.fetch<number>(
    `count(*[_type == "match" && lega._ref == $lega && data < $al ${dal ? '&& data >= $dal' : ''} && coalesce(stato, "aperta") != "annullata"])`,
    { lega: legaId, al, ...(dal && { dal }) },
  )
  if (partite === 0) return { error: await tr('In questa stagione non ci sono ancora partite.') }
  await sanity
    .patch(legaId)
    .setIfMissing({ stagioni: [] })
    .append('stagioni', [{ _key: randomUUID(), nome, ...(dal && { dal }), al }])
    .commit()
  revalidatePath('/', 'layout')
}

// Riapre l'ultima stagione chiusa (se è stata terminata per sbaglio): le sue partite tornano in quella in corso.
export async function riapriUltimaStagione(legaId: string) {
  const admin = await requireIn(legaId, 'organizzatore')
  const ultima = [...(admin.lega.stagioni ?? [])].sort((a, b) => a.al.localeCompare(b.al)).at(-1)
  if (!ultima) return
  await sanity.patch(legaId).unset([`stagioni[_key == "${ultima._key}"]`]).commit()
  revalidatePath('/', 'layout')
}

// Il wrap di fine stagione aperto: il pop-up non si ripropone più (per quella stagione, a quel giocatore).
export async function segnaWrapVisto(chiave: string) {
  if (!/^[\w-]{1,64}$/.test(chiave)) return
  for (const m of await getMemberships()) {
    if (!m.lega.stagioni?.some((s) => s._key === chiave)) continue
    if (m.wrapVisti?.includes(chiave)) return
    await sanity.patch(m._id).set({ wrapVisti: [...(m.wrapVisti ?? []), chiave].slice(-20) }).commit()
    return
  }
}

// Tipo di lega: tra amici (chi risponde per primo gioca) o squadra con allenatore (convocati scelti, indisponibili).
export async function salvaTipoLega(legaId: string, tipo: 'amici' | 'squadra') {
  await requireIn(legaId, 'organizzatore')
  if (tipo === 'squadra') {
    const club = await sanity.fetch<boolean>(`*[_type == "league" && _id == $id][0].club == true`, { id: legaId })
    if (!club) throw new Error('Serve il Club')
    await sanity.patch(legaId).set({ tipo: 'squadra' }).commit()
  } else {
    // tornando "tra amici" il Club attivato con un abbonamento si spegne e libera il posto per un'altra lega
    // (quello acceso dal titolare per provarlo resta, pronto se si torna al Club)
    const clubDi = await sanity.fetch<string | null>(`*[_type == "league" && _id == $id][0].clubDi`, { id: legaId })
    await sanity
      .patch(legaId)
      .unset(clubDi ? ['tipo', 'club', 'clubDi'] : ['tipo'])
      .commit()
  }
  revalidatePath('/', 'layout')
}

// Quante altre leghe hanno il Club acceso con l'abbonamento di questo utente.
function legheClubOccupate(utente: string, tranne: string) {
  return sanity.fetch<number>(`count(*[_type == "league" && club == true && clubDi == $utente && _id != $id])`, { utente, id: tranne })
}

// Opzioni della lega "Squadra": giocatori che si convocano da soli, pagelle a fine partita.
export async function salvaOpzioneSquadra(legaId: string, opzione: 'autoconvocazione' | 'pagelle', attiva: boolean) {
  await requireIn(legaId, 'organizzatore')
  // autoconvocazione: di base no (convoca l'allenatore); pagelle: di base sì
  const p = sanity.patch(legaId)
  if (opzione === 'autoconvocazione') await (attiva ? p.set({ autoconvocazione: true }) : p.unset(['autoconvocazione'])).commit()
  else await (attiva ? p.unset(['pagelle']) : p.set({ pagelle: false })).commit()
  revalidatePath('/', 'layout')
}

// Pagelle a fine partita: l'allenatore dà un voto (1-10, a mezzi punti) e una nota a chi era in lista.
// Un voto lasciato vuoto toglie la pagella di quel giocatore.
export async function salvaPagelle(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireForDoc(matchId, 'organizzatore')
  const bloccato = await clubBloccato(admin.lega)
  if (bloccato) return { error: bloccato }
  const match = await getMatch(matchId)
  if (!match || !match.pagelleAttive || match.tipo === 'allenamento' || match.torneo) return { error: await tr('Partita non trovata.') }
  if (match.stato === 'annullata') return { error: await tr('La partita è annullata.') }
  if (new Date() < orarioPartita(match).fine) return { error: await tr('Le pagelle si danno a partita finita.') }
  const pagelle = []
  for (const c of presenti(match)) {
    const id = c.giocatore._id
    const testo = str(formData, `voto-${id}`).replace(',', '.')
    if (!testo) continue
    const voto = Number(testo)
    if (!Number.isFinite(voto) || voto < 1 || voto > 10 || Math.round(voto * 2) !== voto * 2) return { error: await tr('I voti vanno da 1 a 10, a mezzi punti.') }
    const nota = str(formData, `nota-${id}`).slice(0, 280)
    pagelle.push({ _key: id, _type: 'pagella', giocatore: { _type: 'reference', _ref: id }, voto, ...(nota && { nota }) })
  }
  await sanity.patch(matchId).set({ pagelle }).commit()
  refresh()
  return {}
}

// Club: formato di gioco (giocatori per squadra) e modulo preferito della lega.
export async function salvaFormatoLega(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  const formato = Number(str(formData, 'formato'))
  if (!isFormato(formato)) return { error: await tr('Formato non valido.') }
  const modulo = moduloPer(formato, str(formData, 'modulo'))
  await sanity.patch(legaId).set({ formato, modulo }).commit()
  revalidatePath('/', 'layout')
  return {}
}

// Club: la formazione titolare della partita, con il modulo scelto. In ogni posto uno di quelli in lista
// (ognuno una volta sola); chi non è in campo è in panchina.
export async function salvaFormazioneTitolare(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireForDoc(matchId, 'organizzatore')
  const bloccato = await clubBloccato(admin.lega)
  if (bloccato) return { error: bloccato }
  const match = await getMatch(matchId)
  if (!match || !match.club || match.tipo === 'allenamento' || match.torneo) return { error: await tr('Partita non trovata.') }
  if (match.stato === 'annullata') return { error: await tr('La partita è annullata.') }
  const formato = isFormato(match.formato) ? match.formato : 11
  const modulo = str(formData, 'modulo')
  if (!moduloValido(formato, modulo)) return { error: await tr('Modulo non valido.') }
  const inLista = new Set(presenti(match).map((c) => c.giocatore._id))
  const visti = new Set<string>()
  const scelti = []
  for (const p of postiModulo(modulo)) {
    const id = str(formData, `posto-${p.indice}`)
    if (!id) continue
    if (!inLista.has(id)) return { error: await tr('In campo può andare solo chi è in lista.') }
    if (visti.has(id)) return { error: await tr('Un giocatore è in due posti.') }
    visti.add(id)
    scelti.push({ _key: `p${p.indice}`, posto: p.indice, giocatore: { _type: 'reference', _ref: id } })
  }
  await sanity.patch(matchId).set({ formazione: { modulo, posti: scelti } }).commit()
  revalidatePath('/', 'layout')
  redirect(`/partite/${matchId}`)
}

const MOTIVI: MotivoIndisponibile[] = ['infortunio', 'squalifica', 'altro']

// L'allenatore segna un giocatore come infortunato, squalificato o indisponibile (fino a una data, facoltativa).
export async function salvaIndisponibilita(playerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const lega = await sanity.fetch<string | null>(`*[_type == "player" && _id == $id][0].lega._ref`, { id: playerId })
  if (!lega) return { error: await tr('Giocatore non trovato.') }
  const admin = await requireIn(lega, 'organizzatore')
  const bloccato = await clubBloccato(admin.lega)
  if (bloccato) return { error: bloccato }
  const motivo = str(formData, 'motivo') as MotivoIndisponibile
  if (!MOTIVI.includes(motivo)) {
    await sanity.patch(playerId).unset(['indisponibile']).commit()
  } else {
    const fino = str(formData, 'fino')
    const nota = str(formData, 'nota').slice(0, 120)
    if (fino && !/^\d{4}-\d{2}-\d{2}$/.test(fino)) return { error: await tr('Data non valida.') }
    await sanity
      .patch(playerId)
      .set({ indisponibile: { motivo, ...(fino && { fino }), ...(nota && { nota }) } })
      .commit()
  }
  revalidatePath('/', 'layout')
}

export async function salvaLega(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  const nome = str(formData, 'nome')
  if (nome.length < 2 || nome.length > 40) return { error: await tr('Il nome deve avere tra 2 e 40 caratteri.') }
  const upload = await uploadFoto(formData.get('logo'))
  if (upload && 'error' in upload) return upload
  // Città per il meteo delle partite: si cerca solo se è cambiata.
  const cittaScritta = str(formData, 'citta')
  const attuale = await sanity.fetch<string | null>(`*[_id == $legaId][0].citta.nome`, { legaId })
  const citta = cittaScritta && cittaScritta !== attuale ? await cercaCitta(cittaScritta) : undefined
  if (cittaScritta && cittaScritta !== attuale && !citta) return { error: await tr('Non trovo la città “{citta}”: prova a scriverla in un altro modo.', { citta: cittaScritta }) }
  const patch = sanity.patch(legaId).set({ nome, ...(upload && { logo: upload.foto }), ...(citta && { citta }) })
  if (!upload && formData.get('rimuoviFoto') === 'on') patch.unset(['logo'])
  if (!cittaScritta) patch.unset(['citta'])
  await patch.commit()
  refresh()
  return {}
}

// Interviste: la playlist di YouTube da cui arrivano da sole (vuoto = nessuna).
export async function salvaInterviste(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  const link = str(formData, 'playlist')
  if (!link) {
    await sanity.patch(legaId).unset(['playlistInterviste']).commit()
    refresh()
    return {}
  }
  const playlist = idPlaylist(link)
  if (!playlist) return { error: await tr('Non è un link di una playlist di YouTube: copialo da Condividi nella pagina della playlist.') }
  if (!(await intervisteDellaPlaylist(playlist))) return { error: await tr('Non riesco a leggere la playlist: deve essere Pubblica o Non in elenco, non Privata.') }
  await sanity.patch(legaId).set({ playlistInterviste: playlist }).commit()
  refresh()
  return {}
}

// Cambio rapido del logo toccandolo nell'intestazione (fotocamera o libreria foto).
export async function caricaLogoLega(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  const upload = await uploadFoto(formData.get('logo'))
  if (!upload) return { error: await tr('Nessuna foto selezionata.') }
  if ('error' in upload) return upload
  await sanity.patch(legaId).set({ logo: upload.foto }).commit()
  refresh()
  return {}
}

// Foto sorpresa: scuotendo il telefono ne compare una a caso, a tutto schermo.
// Solo il titolare dell'app le gestisce.
const MAX_FOTO_SORPRESA = 30

export async function aggiungiFotoSorpresa(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'giocatore')
  if (!(await isTitolare())) return { error: await tr('Solo il titolare dell\u2019app può impostare le foto sorpresa.') }
  const quante = await sanity.fetch<number>(`count(*[_id == $legaId][0].fotoSorprese)`, { legaId })
  if (quante >= MAX_FOTO_SORPRESA) return { error: await tr('Al massimo {n} foto: togline qualcuna.', { n: MAX_FOTO_SORPRESA }) }
  const upload = await uploadFoto(formData.get('foto'))
  if (!upload) return { error: await tr('Scatta o scegli una foto.') }
  if ('error' in upload) return upload
  await sanity
    .patch(legaId)
    .setIfMissing({ fotoSorprese: [] })
    .append('fotoSorprese', [{ ...upload.foto, _key: randomUUID() }])
    .commit()
  refresh()
  return {}
}

export async function rimuoviFotoSorpresa(legaId: string, key: string) {
  await requireIn(legaId, 'giocatore')
  if (!(await isTitolare())) throw new Error('Solo il titolare dell\u2019app può impostare le foto sorpresa.')
  // "vecchia" è la foto singola della prima versione
  await sanity
    .patch(legaId)
    .unset([key === 'vecchia' ? 'fotoSorpresa' : `fotoSorprese[_key == ${JSON.stringify(key)}]`])
    .commit()
  refresh()
}

// Nuovo codice: i link d'invito già mandati smettono di funzionare.
export async function rigeneraInvito(legaId: string) {
  await requireIn(legaId, 'organizzatore')
  await sanity.patch(legaId).set({ codiceInvito: await nuovoCodice() }).commit()
  refresh()
}

// ---------- Quote e Satispay ----------

// Link (letto anche dal QR) e QR Satispay dell'organizzatore che riceve le quote.
export async function salvaPagamentiLega(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  const link = str(formData, 'satispayLink')
  if (link) {
    try {
      if (new URL(link).protocol !== 'https:') throw new Error()
    } catch {
      return { error: await tr('Il link deve iniziare con https://') }
    }
  }
  const qr = await uploadFoto(formData.get('satispayQr'))
  if (qr && 'error' in qr) return qr

  const patch = sanity.patch(legaId)
  if (link) patch.set({ satispayLink: link })
  else patch.unset(['satispayLink'])
  if (qr) patch.set({ satispayQr: qr.foto })
  else if (formData.get('rimuoviQr') === 'on') patch.unset(['satispayQr'])
  await patch.commit()
  refresh()
  return {}
}

type StatoPagamento = 'dichiarato' | 'confermato'

// Scrive (o toglie) il pagamento di un giocatore: una voce per giocatore, con chiave il suo ID.
async function segnaPagamento(matchId: string, playerId: string, voce: { stato: StatoPagamento; metodo: 'satispay' | 'contanti' } | null) {
  const tx = sanity.transaction().patch(matchId, (p) => p.setIfMissing({ pagamenti: [] }).unset([`pagamenti[_key == ${JSON.stringify(playerId)}]`]))
  if (voce) {
    tx.patch(matchId, (p) =>
      p.append('pagamenti', [
        { _key: playerId, _type: 'pagamento', giocatore: { _type: 'reference', _ref: playerId }, ...voce, il: new Date().toISOString() },
      ]),
    )
  }
  await tx.commit()
  refresh()
}

async function partitaConQuota(matchId: string) {
  const match = await getMatch(matchId)
  if (!match) throw new Error('Partita non trovata')
  if (match.quota == null) throw new Error('Questa partita non ha una quota')
  return match
}

const inLista = (match: Match, playerId: string) => presenti(match).some((c) => c.giocatore._id === playerId)

// Il giocatore paga con Satispay e lo segna: da quel momento risulta pagato.
export async function dichiaraPagamento(matchId: string) {
  const me = soloGiocatore(await requireForDoc(matchId))
  const match = await partitaConQuota(matchId)
  if (!inLista(match, me._id)) throw new Error('Non sei in lista per questa partita')
  if (match.pagamenti.some((p) => p.giocatoreId === me._id)) return
  await segnaPagamento(matchId, me._id, { stato: 'confermato', metodo: 'satispay' })
}

// Annullare un pagamento segnato per errore: il giocatore il suo, l'organizzatore quello di chiunque.
export async function annullaPagamento(matchId: string, playerId?: string) {
  const me = await requireForDoc(matchId)
  const chi = playerId ?? soloGiocatore(me)._id
  if (chi !== me._id && !me.isAdmin) throw new Error('Solo gli organizzatori possono farlo')
  await segnaPagamento(matchId, chi, null)
}

// Notifica a chi è in lista e non ha ancora pagato.
export async function sollecitaPagamenti(matchId: string): Promise<AvvisoState> {
  const { lega } = await requireForDoc(matchId, 'organizzatore')
  const match = await partitaConQuota(matchId)
  const pagato = new Set(match.pagamenti.map((p) => p.giocatoreId))
  const daSollecitare = presenti(match)
    .map((c) => c.giocatore._id)
    .filter((id) => !pagato.has(id))
  if (daSollecitare.length === 0) return { inviate: 0, totali: 0 }
  return inviaAGiocatori(daSollecitare, (t) => ({
    title: `💶 ${lega.nome}: ${t('quota da pagare')}`,
    body: t('{quota} € per la partita di {data}. Paga con Satispay dall’app.', {
      quota: match.quota ?? 0,
      data: t.data(match.data, { weekday: 'long', day: 'numeric', month: 'long' }),
    }),
    url: `/partite/${matchId}`,
    tag: `quota-${matchId}`,
  }))
}

// ---------- Km percorsi (da Apple Salute o da Strava) ----------

// I km si aggiungono a partita finita, solo da chi era in lista.
async function partitaPerKm(matchId: string) {
  const me = soloGiocatore(await requireForDoc(matchId))
  const match = await getMatch(matchId)
  if (!match) throw new Error('Partita non trovata')
  if (!inLista(match, me._id)) throw new Error('Non eri in lista per questa partita')
  if (new Date() < orarioPartita(match).fine) throw new Error('I km si aggiungono a partita finita')
  return { me, match }
}

async function scriviKm(matchId: string, playerId: string, km: number | null, fonte: FonteKm) {
  const tx = sanity.transaction().patch(matchId, (p) => p.setIfMissing({ distanze: [] }).unset([`distanze[_key == ${JSON.stringify(playerId)}]`]))
  if (km != null) {
    tx.patch(matchId, (p) =>
      p.append('distanze', [{ _key: playerId, _type: 'distanza', giocatore: { _type: 'reference', _ref: playerId }, km, fonte }]),
    )
  }
  await tx.commit()
  refresh()
}

// Km letti da Apple Salute nell'app per iPhone (non si inseriscono a mano).
// Più di così non si corre: 10 km per ogni ora di partita (anche i professionisti stanno sotto).
// Valori più alti vengono da un'app che salva la distanza di tutto il giorno in un solo dato.
const KM_ORA_MAX = 10

export async function salvaKm(matchId: string, km: number, fonte: 'salute'): Promise<{ error?: string }> {
  const { me, match } = await partitaPerKm(matchId)
  if (fonte !== 'salute') return { error: await tr('I km si prendono dall\u2019app Salute del telefono.') }
  // l'allenamento dell'orologio conta intero anche se va un po' oltre l'orario: mezz'ora di margine
  const massimo = (KM_ORA_MAX * ((match.durataMinuti ?? 60) + 30)) / 60
  if (!Number.isFinite(km) || km <= 0) return { error: await tr('Dall\u2019app Salute arriva una distanza non valida.') }
  if (km > massimo) {
    return {
      error: await tr('{km} km in {min} minuti non sono possibili: forse un’app salva in Salute la distanza di tutto il giorno. Riprova dopo aver aggiornato The Cap.', {
        km: Math.round(km * 10) / 10,
        min: match.durataMinuti ?? 60,
      }),
    }
  }
  await scriviKm(matchId, me._id, Math.round(km * 100) / 100, fonte)
  return {}
}

// Le mie partite finite negli ultimi 7 giorni, in cui ero in lista e mancano i miei km, più quelle finite
// da meno di 24 ore con i km presi da Salute: l'iPhone scrive in Salute con qualche minuto di ritardo,
// quindi si rileggono finché si aggiornano. L'app li completa da sola (components/km-automatici.tsx).
export async function partiteSenzaKm(): Promise<{ matchId: string; inizio: number; fine: number; km?: number }[]> {
  const mie = (await getMemberships()).map((m) => m._id)
  if (mie.length === 0) return []
  const ora = Date.now()
  const partite = await sanity.fetch<{ _id: string; data: string; durataMinuti?: number; io: string; d?: { _key: string; km?: number; fonte?: string }[] }[]>(
    `*[_type == "match" && coalesce(stato, "aperta") in ["aperta", "chiusa", "giocata"] && data > $da && data < $a
      && count(convocazioni[risposta == "presente" && giocatore._ref in $mie]) > 0]{
      _id, data, durataMinuti,
      "io": convocazioni[risposta == "presente" && giocatore._ref in $mie][0].giocatore._ref,
      "d": distanze[]{_key, km, fonte}
    }`,
    { mie, da: new Date(ora - 7 * 86400_000).toISOString(), a: new Date(ora).toISOString() },
  )
  return partite
    .map((p) => {
      const { inizio, fine } = orarioPartita({ data: p.data, durataMinuti: p.durataMinuti ?? 60 })
      return { matchId: p._id, inizio: inizio.getTime(), fine: fine.getTime(), miei: p.d?.find((x) => x._key === p.io) }
    })
    .filter((p) => p.fine <= ora && (!p.miei || (p.miei.fonte === 'salute' && ora - p.fine < 86400_000)))
    .map(({ miei, ...p }) => ({ ...p, km: miei?.km }))
}

export async function togliKm(matchId: string) {
  const { me } = await partitaPerKm(matchId)
  await scriviKm(matchId, me._id, null, 'manuale')
}

export type EsitoStrava = { km?: number; attivita?: string; error?: string; daCollegare?: boolean }

// Cerca su Strava l'attività fatta durante la partita e ne salva i km.
// L'organizzatore corregge i km di un giocatore in lista, per esempio quando l'orologio non li scrive
// nell'orario della partita: compaiono a tutti come "inseriti a mano". Campo vuoto = toglie i km.
export async function correggiKm(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireForDoc(matchId, 'organizzatore')
  const match = await getMatch(matchId)
  if (!match) return { error: await tr('Partita non trovata') }
  if (new Date() < orarioPartita(match).fine) return { error: await tr('I km si aggiungono a partita finita') }
  const playerId = str(formData, 'giocatore')
  if (!presenti(match).some((c) => c.giocatore._id === playerId)) return { error: await tr('Scegli un giocatore in lista.') }
  const testo = str(formData, 'km').replace(',', '.')
  if (!testo) {
    await scriviKm(matchId, playerId, null, 'manuale')
    return
  }
  const km = Number(testo)
  const massimo = Math.round((KM_ORA_MAX * (match.durataMinuti ?? 60)) / 60)
  if (!Number.isFinite(km) || km <= 0 || km > massimo) return { error: await tr('Scrivi un numero di km tra 0 e {max}.', { max: massimo }) }
  await scriviKm(matchId, playerId, Math.round(km * 100) / 100, 'manuale')
}

export async function kmDaStrava(matchId: string): Promise<EsitoStrava> {
  if (!stravaConfigurato()) return { error: await tr('Strava non è ancora attivo su The Cap.') }
  const { me, match } = await partitaPerKm(matchId)
  const utente = await getUtente()
  if (!utente) return { error: await tr('Accesso richiesto.') }
  const { inizio, fine } = orarioPartita(match)
  const r = await kmStrava(utente.id, inizio, fine).catch(() => null)
  if (!r) return { error: await tr('Strava non risponde: riprova tra poco.') }
  if (!r.collegato) return { daCollegare: true }
  if (!r.attivita) return { error: await tr('Su Strava non c\u2019è un\u2019attività durante l\u2019orario della partita.') }
  const km = Math.round(r.attivita.km * 100) / 100
  await scriviKm(matchId, me._id, km, 'strava')
  return { km, attivita: r.attivita.nome }
}

// Indirizzo per collegare Strava (aperto nel browser di sistema dall'app, o nella stessa pagina dal computer).
export async function collegaStrava(app: boolean, torna: string) {
  if (!stravaConfigurato()) throw new Error('Strava non è ancora attivo su The Cap.')
  const utente = await getUtente()
  if (!utente) throw new Error('Accesso richiesto')
  return urlCollegamento(utente.id, app, torna.startsWith('/') ? torna : '/', await baseUrl())
}

export async function scollegaStrava() {
  const utente = await getUtente()
  if (!utente) throw new Error('Accesso richiesto')
  await scollega(utente.id)
  refresh()
}

// ---------- Preferenze notifiche e comunicazioni ----------

// Il giocatore sceglie quali notifiche ricevere (per la lega attiva).
export async function salvaPreferenzaNotifica(chiave: string, attiva: boolean) {
  const me = soloGiocatore(await requirePlayer())
  if (!(chiave in CATEGORIE_NOTIFICHE)) throw new Error('Tipo di notifica non valido')
  await sanity.patch(me._id).setIfMissing({ notifiche: {} }).set({ [`notifiche.${chiave}`]: !!attiva }).commit()
}

// Messaggio del capitano (o di un organizzatore) a tutta la squadra, come notifica.
export async function inviaComunicazione(_prev: AvvisoState, formData: FormData): Promise<AvvisoState> {
  const me = await requirePlayer()
  if (!me.isAdmin && me.badge !== 'capitano') return { error: await tr('Solo il capitano e gli organizzatori possono scrivere alla squadra.') }
  const testo = str(formData, 'testo')
  if (testo.length < 2) return { error: await tr('Scrivi un messaggio.') }
  if (testo.length > 150) return { error: await tr('Massimo 150 caratteri.') }
  return inviaATutti(me.lega._id, { title: `📢 ${displayName(me)} · ${me.lega.nome}`, body: testo, url: '/', tag: `comunicazione-${Date.now()}` }, 'capitano')
}

// ---------- Unione di schede doppie ----------

// L'organizzatore unisce un doppione ("togli") nella scheda giusta ("tieni"): account,
// partite, gol, MVP e pagamenti passano a "tieni", i dati mancanti vengono completati,
// poi il doppione viene eliminato.
export async function unisciSchede(tieniId: string, togliId: string) {
  if (tieniId === togliId) throw new Error('Scegli due schede diverse')
  const admin = await requireForDoc(tieniId, 'organizzatore')
  type Scheda = Player & { _id: string; legaId?: string; clerkUserId?: string; foto?: unknown }
  const [tieni, togli] = await Promise.all(
    [tieniId, togliId].map((id) =>
      sanity.fetch<Scheda | null>(`*[_type == "player" && _id == $id][0]{..., "legaId": lega._ref}`, { id }),
    ),
  )
  if (!tieni || !togli) throw new Error('Scheda non trovata')
  if (togli.legaId !== admin.lega._id || tieni.legaId !== admin.lega._id) throw new Error('Le schede devono essere della stessa lega')
  if (tieni.clerkUserId && togli.clerkUserId && tieni.clerkUserId !== togli.clerkUserId) {
    throw new Error('Sono due account diversi: non si possono unire')
  }

  const partite = await sanity.fetch<MatchDaUnire[]>(
    `*[_type == "match" && references($togli)]{_id, _rev, convocazioni, squadraA, squadraB, marcatori, mvp, pagamenti}`,
    { togli: togliId },
  )
  const tx = sanity.transaction()
  for (const m of partite) tx.patch(m._id, (p) => p.ifRevisionId(m._rev).set(riscriviPartita(m, tieniId, togliId)))
  // Squadre dei tornei: il doppione viene sostituito dalla scheda giusta (senza ripeterla).
  const tornei = await sanity.fetch<{ _id: string; _rev: string; squadre: { _key: string; giocatori?: { _key?: string; _ref: string }[] }[] }[]>(
    `*[_type == "tournament" && references($togli)]{_id, _rev, squadre}`,
    { togli: togliId },
  )
  for (const t of tornei) {
    const squadre = t.squadre.map((sq) => {
      const visti = new Set<string>()
      const giocatori = (sq.giocatori ?? [])
        .map((g) => (g._ref === togliId ? { ...g, _ref: tieniId } : g))
        .filter((g) => !visti.has(g._ref) && visti.add(g._ref))
      return { ...sq, giocatori }
    })
    tx.patch(t._id, (p) => p.ifRevisionId(t._rev).set({ squadre }))
  }

  // Dati che mancano alla scheda giusta: si prendono dal doppione.
  const completa = Object.fromEntries(
    (['clerkUserId', 'cognome', 'soprannome', 'numero', 'foto', 'ruolo', 'piede', 'badge', 'telefono'] as const)
      .filter((k) => !(tieni as Record<string, unknown>)[k] && (togli as Record<string, unknown>)[k])
      .map((k) => [k, (togli as Record<string, unknown>)[k]]),
  )
  // email finta (es. mario@finta.invalid) o mancante nella scheda giusta: prende quella vera del doppione
  const emailFinta = !tieni.email || /\.(invalid|example|test)$|@(example|esempio|finta)\./i.test(tieni.email)
  if (emailFinta && togli.email && togli.email !== tieni.email) (completa as Record<string, unknown>).email = togli.email
  if (Object.keys(completa).length) tx.patch(tieniId, (p) => p.set(completa))
  tx.delete(togliId)
  await tx.commit()
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/giocatori/${tieniId}`)
}

// ---------- Eliminazione dell'account ----------

// Cancella l'account (Clerk) e i dati personali. Le schede restano nelle partite già giocate
// come "Ex giocatore", senza nome, contatti né foto, così le statistiche degli altri restano giuste.
// "Il mio account": nome, cognome, telefono, ruolo e piede. Si salvano nell'account e in tutte
// le mie schede giocatore (e nelle leghe in cui entrerò dopo, vedi nuovaScheda).
export async function salvaAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const utente = await getUtente()
  if (!utente) return { error: await tr('Accesso richiesto.') }
  const nome = str(formData, 'nome')
  const cognome = str(formData, 'cognome')
  const telefonoScritto = str(formData, 'telefono')
  const telefono = telefonoScritto ? normalizzaTelefono(telefonoScritto) : ''
  const ruolo = (RUOLI as readonly string[]).includes(str(formData, 'ruolo')) ? str(formData, 'ruolo') : ''
  const piede = (PIEDI as readonly string[]).includes(str(formData, 'piede')) ? str(formData, 'piede') : ''
  const dataNascita = str(formData, 'dataNascita')
  if (!nome) return { error: await tr('Il nome è obbligatorio.') }
  if (!cognome && str(formData, 'dopo')) return { error: await tr('Scrivi anche il cognome.') }
  // Consensi: i Termini si accettano al primo accesso (obbligatori), foto e video si scelgono anche in "Il mio account".
  const ora = new Date().toISOString()
  const accettaTermini = formData.get('accettoTermini') === 'on'
  if (str(formData, 'dopo') && !accettaTermini && utente.consensi.termini?.versione !== VERSIONE_TERMINI) {
    return { error: await tr('Per continuare accetta i Termini d’uso e l’Informativa privacy.') }
  }
  const sceltaImmagini = formData.has('sceltaImmagini') ? formData.get('consensoImmagini') === 'on' : undefined
  const consensi: Consensi = {
    ...utente.consensi,
    ...(accettaTermini && { termini: { versione: VERSIONE_TERMINI, il: ora } }),
    ...(sceltaImmagini !== undefined && sceltaImmagini !== utente.consensi.immagini?.si && { immagini: { si: sceltaImmagini, il: ora } }),
  }
  if (dataNascita) {
    const anni = /^\d{4}-\d{2}-\d{2}$/.test(dataNascita) ? eta(dataNascita) : NaN
    if (!(anni >= 5 && anni <= 100)) return { error: await tr('La data di nascita non sembra valida.') }
  }
  if (nome.length > 40 || cognome.length > 40) return { error: await tr('Nome e cognome: massimo 40 caratteri.') }
  if (telefonoScritto && !/^\+?\d{6,15}$/.test(telefono)) return { error: await tr('Il numero di telefono non sembra valido.') }
  const upload = await uploadFoto(formData.get('foto'))
  if (upload && 'error' in upload) return upload

  const { clerkClient } = await import('@clerk/nextjs/server')
  const clerk = await clerkClient()
  await clerk.users.updateUser(utente.id, { firstName: nome, lastName: cognome })
  await clerk.users.updateUserMetadata(utente.id, {
    privateMetadata: {
      telefono: telefono || null,
      ruolo: ruolo || null,
      piede: piede || null,
      dataNascita: dataNascita || null,
      ...(upload && { fotoAsset: upload.foto.asset._ref }),
      profiloCompleto: true,
      consensi,
    },
  })

  const mieSchede = await sanity.fetch<{ _id: string; ruolo?: string }[]>(`*[_type == "player" && clerkUserId == $id]{_id, ruolo}`, { id: utente.id })
  const schede = mieSchede.map((s) => s._id)
  // nelle leghe Club il ruolo preciso (es. terzino destro, allenatore) lo decide l'allenatore: il profilo non lo cambia
  const ruoloClub = new Set(mieSchede.filter((s) => s.ruolo && !(RUOLI as readonly string[]).includes(s.ruolo)).map((s) => s._id))
  // foto nuova: quelle di prima (profilo e schede) si cancellano dopo il salvataggio, se non servono più
  const fotoPrima = upload
    ? [utente.fotoAsset, ...(await sanity.fetch<string[]>(`*[_id in $schede].foto.asset._ref`, { schede }))]
    : []
  if (schede.length) {
    const valori = { cognome, telefono, ruolo, piede, dataNascita }
    const tx = sanity.transaction()
    for (const id of schede) {
      const campi = Object.entries(valori).filter(([k]) => !(k === 'ruolo' && ruoloClub.has(id)))
      tx.patch(id, (p) =>
        p
          .set({
            nome,
            ...(upload && { foto: upload.foto }),
            ...(consensi.immagini && { consensoImmagini: consensi.immagini.si }),
            ...Object.fromEntries(campi.filter(([, v]) => v)),
          })
          .unset(campi.filter(([, v]) => !v).map(([k]) => k)),
      )
    }
    await tx.commit()
  }
  if (upload) await cancellaFotoInutili(fotoPrima, utente.id)
  // dalla pagina "Completa il tuo profilo" si torna dove si stava andando: chi era arrivato con l'invito
  // di una lega o di una squadra ci entra subito (quello di un torneo fa scegliere la squadra)
  const dopo = str(formData, 'dopo')
  const aggiornato = {
    ...utente,
    nome,
    cognome,
    telefono: telefono || undefined,
    ruolo: ruolo || undefined,
    piede: piede || undefined,
    dataNascita: dataNascita || undefined,
    fotoAsset: upload ? upload.foto.asset._ref : utente.fotoAsset,
  }
  const invito = dopo.match(/^\/invito\/([A-Za-z0-9]+)$/)?.[1]
  if (invito) await entraConInvito(invito, aggiornato)
  const squadra = dopo.match(/^\/invito-squadra\/([A-Za-z0-9]+)$/)?.[1]
  if (squadra) await entraConCodiceSquadra(squadra, aggiornato)
  if (dopo) {
    const vai = dopo.startsWith('/') && !dopo.startsWith('//') ? dopo : '/'
    // chi non aveva mai accettato i Termini è appena arrivato: prima il tutorial con le funzioni chiave
    // (chi riaccetta i Termini aggiornati no)
    redirect(utente.consensi.termini ? vai : `/tutorial?dopo=${encodeURIComponent(vai)}`)
  }
  refresh()
  return {}
}

// Un giocatore a caso della rosa (prima chi usa già l'app), per prendere il posto dell'organizzatore.
async function nuovoOrganizzatoreACaso(legaId: string, escludi: string) {
  const candidati = await sanity.fetch<{ _id: string; collegato: boolean }[]>(
    `*[_type == "player" && lega._ref == $lega && _id != $me && attivo != false]{_id, "collegato": defined(clerkUserId)}`,
    { lega: legaId, me: escludi },
  )
  const collegati = candidati.filter((c) => c.collegato)
  const tra = collegati.length ? collegati : candidati
  return tra.length ? tra[randomInt(tra.length)]._id : null
}

// Esco da una lega: la mia scheda resta (con lo storico) ma non è più attiva; se mi reinvitano rientro con quella.
// Se ero l'unico organizzatore, un giocatore a caso diventa organizzatore e riceve una notifica.
export async function esciDallaLega(legaId: string) {
  const me = (await getMemberships()).find((m) => m.lega._id === legaId)
  if (!me) throw new Error('Non fai parte di questa lega')
  const altriOrganizzatori = await sanity.fetch<number>(
    `count(*[_type == "player" && lega._ref == $lega && _id != $me && isAdmin == true && attivo != false])`,
    { lega: legaId, me: me._id },
  )
  const nuovo = me.isAdmin && altriOrganizzatori === 0 ? await nuovoOrganizzatoreACaso(legaId, me._id) : null
  const tx = sanity.transaction().patch(me._id, (p) => p.set({ attivo: false, isAdmin: false, puoInserireRisultati: false }))
  if (nuovo) tx.patch(nuovo, (p) => p.set({ isAdmin: true }))
  await tx.commit()
  if (nuovo) {
    await inviaAGiocatori([nuovo], (t) => ({
      title: `👑 ${t('Sei il nuovo organizzatore di {lega}', { lega: me.lega.nome })}`,
      body: t('L’organizzatore ha lasciato la lega: ora gestisci tu partite, squadre e inviti.'),
      url: '/',
      tag: `nuovo-organizzatore-${nuovo}`,
    })).catch(() => undefined)
  }
  if ((await cookies()).get(COOKIE_LEGA)?.value === legaId) (await cookies()).delete(COOKIE_LEGA)
  refresh()
}

// L'organizzatore toglie un giocatore dalla rosa e dalla lega. La scheda resta (lo storico delle partite giocate
// non cambia) ma non è più attiva e non compare più nella rosa; esce anche dalle partite non ancora giocate.
// Se riceve un nuovo invito rientra con la sua scheda.
export async function rimuoviDallaLega(giocatoreId: string) {
  const admin = await requireForDoc(giocatoreId, 'organizzatore')
  if (admin._id === giocatoreId) throw new Error('Per uscire dalla lega usa “Esci dalla lega”')
  await togliDallaRosa(giocatoreId, admin.lega._id)
  refresh()
}

async function togliDallaRosa(giocatoreId: string, legaId: string) {
  const ora = new Date().toISOString()
  const partite = await sanity.fetch<(SquadreRaw & { _id: string })[]>(
    `*[_type == "match" && lega._ref == $lega && stato in ["aperta", "chiusa"] && !defined(torneo) && data > $ora && references($id)]{_id, _rev, postiDisponibili, convocazioni, squadraA, squadraB}`,
    { lega: legaId, ora, id: giocatoreId },
  )
  const tx = sanity.transaction().patch(giocatoreId, (p) => p.set({ attivo: false, isAdmin: false, puoInserireRisultati: false, rimossoIl: ora }))
  const senza = (s?: { _key: string; _ref: string }[]) => (s ?? []).filter((r) => r._ref !== giocatoreId)
  for (const m of partite) {
    const list = (m.convocazioni ?? []).filter((c) => c.giocatore?._ref !== giocatoreId)
    tx.patch(m._id, (p) =>
      p.ifRevisionId(m._rev).set({ convocazioni: assegnaPosti(list, m.postiDisponibili), squadraA: senza(m.squadraA), squadraB: senza(m.squadraB) }),
    )
  }
  await tx.commit()
}

// Un organizzatore di più leghe porta un giocatore in un'altra delle sue leghe, con i suoi dati e le sue
// caratteristiche. "Sposta" lo toglie anche da questa (lo storico delle partite resta qui); "aggiungi" lo lascia
// in entrambe. Se nell'altra lega c'era già (lo stesso account, o la stessa email), si riattiva quella scheda.
export async function spostaGiocatore(giocatoreId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireForDoc(giocatoreId, 'organizzatore')
  const destinazione = str(formData, 'lega')
  const togli = formData.get('modo') !== 'aggiungi'
  if (!destinazione || destinazione === admin.lega._id) return { error: await tr('Scegli un’altra lega.') }
  await requireIn(destinazione, 'organizzatore')
  if (togli && admin._id === giocatoreId) return { error: await tr('Per uscire da questa lega usa “Esci dalla lega”.') }

  const g = await sanity.fetch<(Player & { clerkUserId?: string; dataNascita?: string; caratteristiche?: Record<string, number> }) | null>(
    `*[_type == "player" && _id == $id][0]`,
    { id: giocatoreId },
  )
  if (!g) return { error: await tr('Giocatore non trovato.') }
  const gia = await sanity.fetch<string | null>(
    `*[_type == "player" && lega._ref == $lega && ((defined($utente) && clerkUserId == $utente) || (defined($email) && lower(email) == lower($email)))][0]._id`,
    { lega: destinazione, utente: g.clerkUserId ?? null, email: g.email ?? null },
  )
  if (gia) {
    await sanity.patch(gia).set({ attivo: true }).unset(['rimossoIl']).commit()
  } else {
    const campi = ['nome', 'cognome', 'soprannome', 'numero', 'email', 'telefono', 'dataNascita', 'foto', 'ruolo', 'piede', 'caratteristiche', 'clerkUserId'] as const
    await sanity.create({
      ...(g.clerkUserId && { _id: `player-${destinazione}-${g.clerkUserId}` }),
      _type: 'player',
      lega: { _type: 'reference', _ref: destinazione },
      ...Object.fromEntries(campi.filter((c) => g[c] != null).map((c) => [c, g[c]])),
      isAdmin: false,
      attivo: true,
    })
  }
  if (togli) await togliDallaRosa(giocatoreId, admin.lega._id)
  if (togli) redirect('/giocatori')
  refresh()
  return {}
}

// L'organizzatore elimina la lega con tutto quello che contiene (partite, serie, giocatori). Non si torna indietro.
export async function eliminaLega(legaId: string) {
  const me = await requireIn(legaId, 'organizzatore')
  if (me.ospite) throw new Error('Per eliminare una lega devi farne parte')
  const ids = await sanity.fetch<string[]>(`*[_type in ["match", "series", "tournament", "player"] && lega._ref == $lega]._id`, { lega: legaId })
  // prima partite, serie e tornei (che puntano ai giocatori), poi i giocatori, infine la lega
  const ordine = await sanity.fetch<{ _id: string; _type: string }[]>(`*[_id in $ids]{_id, _type}`, { ids })
  const tx = sanity.transaction()
  for (const d of ordine.filter((d) => d._type !== 'player')) tx.delete(d._id)
  for (const d of ordine.filter((d) => d._type === 'player')) tx.delete(d._id)
  tx.delete(legaId)
  await tx.commit()
  if ((await cookies()).get(COOKIE_LEGA)?.value === legaId) (await cookies()).delete(COOKIE_LEGA)
  refresh()
}

export async function eliminaAccount(): Promise<FormState> {
  const utente = await getUtente()
  if (!utente) return { error: await tr('Accesso richiesto.') }

  const schede = await sanity.fetch<{ _id: string; isAdmin?: boolean; legaId: string; lega: string; altriAdmin: number; altriMembri: number }[]>(
    `*[_type == "player" && clerkUserId == $id]{
      _id, isAdmin, "legaId": lega._ref, "lega": lega->nome,
      "altriAdmin": count(*[_type == "player" && lega._ref == ^.lega._ref && _id != ^._id && isAdmin == true && attivo != false]),
      "altriMembri": count(*[_type == "player" && lega._ref == ^.lega._ref && _id != ^._id && attivo != false])
    }`,
    { id: utente.id },
  )
  const tx = sanity.transaction()

  // Se ero l'unico organizzatore di una lega con altri giocatori, ne diventa organizzatore uno a caso
  // della rosa (prima chi usa già l'app), che riceve una notifica.
  const nuoviOrganizzatori: { id: string; lega: string }[] = []
  for (const s of schede.filter((s) => s.isAdmin && s.altriAdmin === 0 && s.altriMembri > 0)) {
    const scelto = await nuovoOrganizzatoreACaso(s.legaId, s._id)
    if (!scelto) continue
    tx.patch(scelto, (p) => p.set({ isAdmin: true }))
    nuoviOrganizzatori.push({ id: scelto, lega: s.lega })
  }

  for (const s of schede) {
    tx.patch(s._id, (p) =>
      p
        .set({ nome: 'Ex giocatore', attivo: false, isAdmin: false, puoInserireRisultati: false })
        .unset(['cognome', 'soprannome', 'email', 'telefono', 'foto', 'clerkUserId', 'badge', 'notifiche']),
    )
  }
  const iscrizioni = await sanity.fetch<string[]>(`*[_type == "pushSubscription" && clerkUserId == $id]._id`, { id: utente.id })
  for (const id of iscrizioni) tx.delete(id)
  const foto = await sanity.fetch<string[]>(`*[_type == "player" && clerkUserId == $id].foto.asset._ref`, { id: utente.id })
  // la scheda dell'abbonamento Pro (con l'email): ricevute e pagamenti restano ad Apple / Google
  const abbonamenti = await sanity.fetch<string[]>(`*[_type == "abbonamento" && clerkUserId == $id]._id`, { id: utente.id })
  for (const id of abbonamenti) tx.delete(id)
  await tx.commit()
  // e i dati dell'utente su RevenueCat (così non arrivano più aggiornamenti che ricreano la scheda)
  if (process.env.REVENUECAT_SECRET_KEY) {
    await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(utente.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
    }).catch(() => undefined)
  }
  // le foto dell'account spariscono davvero (i file su Sanity sono raggiungibili da chi ha il link)
  await cancellaFotoInutili([...foto, utente.fotoAsset])

  for (const n of nuoviOrganizzatori) {
    await inviaAGiocatori([n.id], (t) => ({
      title: `👑 ${t('Sei il nuovo organizzatore di {lega}', { lega: n.lega })}`,
      body: t('L’organizzatore ha lasciato l’app: ora gestisci tu partite, squadre e inviti.'),
      url: '/',
      tag: `nuovo-organizzatore-${n.id}`,
    })).catch(() => undefined)
  }

  const { clerkClient } = await import('@clerk/nextjs/server')
  await (await clerkClient()).users.deleteUser(utente.id)
  ;(await cookies()).delete(COOKIE_LEGA)
  redirect('/account-eliminato')
}

// ---------- Tornei (Pro) ----------

type SquadraDoc = {
  _key: string
  _type: 'squadraTorneo'
  nome: string
  colore: string
  logo?: unknown
  girone?: string
  capitano?: { _type: 'reference'; _ref: string }
  codiceInvito?: string
  giocatori: { _key: string; _type: 'reference'; _ref: string }[] }
type CalendarioTorneo = { inizio: string; ogniGiorni: number; durataMinuti: number; luogo: string }

// Codice per il link d'invito di una squadra del torneo (diverso da tutti gli altri).
async function nuovoCodiceSquadra(usati: Set<string>) {
  for (;;) {
    const codice = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
    if (usati.has(codice)) continue
    const esiste = await sanity.fetch<number>(`count(*[_type == "tournament" && $codice in squadre[].codiceInvito])`, { codice })
    if (!esiste) return codice
  }
}

// Squadre dal modulo: nome_<i>, foto_<i>, capitano_<i> e squadra_<giocatore> = indice della squadra (solo giocatori
// della rosa, ognuno in una squadra). `esistenti`: le squadre di prima (chiavi, colori, foto, codici d'invito).
// Il capitano è quello scelto, altrimenti quello di prima se è ancora in squadra, altrimenti il primo giocatore.
async function squadreDalModulo(formData: FormData, legaId: string, quante: number, esistenti?: SquadraDoc[]): Promise<SquadraDoc[] | string> {
  const rosa = new Set(await sanity.fetch<string[]>(`*[_type == "player" && lega._ref == $lega && attivo != false]._id`, { lega: legaId }))
  const lingua = await getLingua()
  const squadre: SquadraDoc[] = Array.from({ length: quante }, (_, i) => ({
    _key: esistenti?.[i]?._key ?? `s${i + 1}`,
    _type: 'squadraTorneo',
    nome: str(formData, `nome_${i}`).slice(0, 30) || nomePredefinito(i, lingua),
    colore: esistenti?.[i]?.colore || SQUADRE_PREDEFINITE[i].colore,
    ...(esistenti?.[i]?.logo ? { logo: esistenti[i].logo } : {}),
    ...(esistenti?.[i]?.girone ? { girone: esistenti[i].girone } : {}),
    giocatori: [],
  }))
  for (const [k, v] of formData) {
    if (!k.startsWith('squadra_') || typeof v !== 'string' || v === '') continue
    const id = k.slice('squadra_'.length)
    const sq = squadre[Number(v)]
    if (rosa.has(id) && sq) sq.giocatori.push({ _key: id, _type: 'reference', _ref: id })
  }
  const vuota = squadre.find((sq) => !sq.giocatori.length)
  if (vuota) return tr('La squadra “{squadra}” non ha giocatori.', { squadra: vuota.nome })
  if (new Set(squadre.map((sq) => sq.nome.toLowerCase())).size < squadre.length) return tr('Due squadre hanno lo stesso nome.')
  const usati = new Set<string>()
  for (const [i, sq] of squadre.entries()) {
    const upload = await uploadFoto(formData.get(`foto_${i}`))
    if (upload && 'error' in upload) return `${sq.nome}: ${upload.error}`
    if (upload) sq.logo = upload.foto
    const ids = sq.giocatori.map((g) => g._ref)
    const capitano = [str(formData, `capitano_${i}`), esistenti?.[i]?.capitano?._ref, ids[0]].find((id) => id && ids.includes(id))!
    sq.capitano = { _type: 'reference', _ref: capitano }
    sq.codiceInvito = esistenti?.[i]?.codiceInvito || (await nuovoCodiceSquadra(usati))
    usati.add(sq.codiceInvito)
  }
  return squadre
}

// Orario di una partita: giornata `turno` (da 1) a distanza di `ogniGiorni` giorni dalla prima,
// spostata di `slot` partite (si giocano una dopo l'altra). L'ora è quella italiana, anche col cambio d'ora.
function orarioTorneo(cal: CalendarioTorneo, turno: number, slot: number) {
  const [giorno, ora] = cal.inizio.split('T')
  const base = new Date(`${giorno}T${ora}:00Z`)
  base.setUTCDate(base.getUTCDate() + (turno - 1) * cal.ogniGiorni)
  base.setUTCMinutes(base.getUTCMinutes() + slot * cal.durataMinuti)
  return romeLocalToISO(base.toISOString().slice(0, 16))
}

// Partita di un torneo: squadre fisse già fatte, tutti "presenti", niente finestra di convocazioni.
// `giorno`: la giornata del calendario in cui cade (di base il turno; nella fase finale dei gironi viene dopo).
function partitaTorneo(
  legaId: string,
  torneoId: string,
  cal: CalendarioTorneo,
  sa: SquadraDoc,
  sb: SquadraDoc,
  dove: { turno: number; giorno?: number; posizione?: number; slot: number; fase?: 'gironi' | 'eliminazione'; girone?: string },
) {
  const adesso = new Date().toISOString()
  const giocatori = [...sa.giocatori, ...sb.giocatori]
  return {
    _type: 'match',
    lega: { _type: 'reference', _ref: legaId },
    torneo: { _type: 'reference', _ref: torneoId },
    turno: dove.turno,
    ...(dove.posizione != null && { posizione: dove.posizione }),
    ...(dove.fase && { fase: dove.fase }),
    ...(dove.girone && { girone: dove.girone }),
    chiaveA: sa._key,
    chiaveB: sb._key,
    nomeA: sa.nome,
    nomeB: sb.nome,
    data: orarioTorneo(cal, dove.giorno ?? dove.turno, dove.slot),
    durataMinuti: cal.durataMinuti,
    luogo: cal.luogo,
    postiDisponibili: giocatori.length,
    postiAutomatici: false,
    stato: 'chiusa',
    aperturaConvocazioni: adesso,
    chiusuraConvocazioni: adesso,
    durataFinestraMinuti: 15,
    convocazioni: giocatori.map((g) => ({ _key: g._ref, _type: 'convocazione', giocatore: { _type: 'reference', _ref: g._ref }, risposta: 'presente', rispostoIl: adesso })),
    squadraA: sa.giocatori,
    squadraB: sb.giocatori,
    formazioniUfficialiIl: adesso,
  }
}

// Tabellone: crea le partite degli incroci di cui si conoscono entrambe le squadre (all'inizio il primo turno,
// poi i turni successivi man mano che arrivano i risultati). Gironi + tabellone: quando tutte le partite
// dei gironi sono finite, le prime di ogni girone formano il tabellone (incroci tra gironi diversi).
async function aggiornaTabellone(torneoId: string) {
  const t = await sanity.fetch<{
    legaId: string
    formato?: string
    calendario?: CalendarioTorneo
    primoTurno?: string[]
    qualificate?: number
    puntiVittoria?: number
    puntiPareggio?: number
    squadre: SquadraDoc[]
  } | null>(
    `*[_type == "tournament" && _id == $id][0]{"legaId": lega._ref, formato, calendario, primoTurno, qualificate, puntiVittoria, puntiPareggio, squadre}`,
    { id: torneoId },
  )
  if (!t || (t.formato !== 'eliminazione' && t.formato !== 'gironi') || !t.calendario) return
  const tutte = await getPartiteTorneo(torneoId)
  const gironi = t.formato === 'gironi'
  const deiGironi = tutte.filter((m) => m.fase === 'gironi')
  const partite = gironi ? tutte.filter((m) => m.fase === 'eliminazione') : tutte
  // nella fase finale dei gironi, i turni del calendario vengono dopo l'ultima giornata dei gironi
  const giornateGironi = Math.max(0, ...deiGironi.map((m) => m.turno ?? 0))

  let primoTurno = t.primoTurno
  let chiavi = t.squadre.map((sq) => sq._key)
  if (gironi) {
    if (!primoTurno?.length) {
      if (!deiGironi.length || deiGironi.some((m) => m.stato !== 'giocata' && m.stato !== 'annullata')) return
      const lettere = [...new Set(t.squadre.map((sq) => sq.girone).filter(Boolean))].sort() as string[]
      const classifiche = lettere.map((l) =>
        classifica(
          t.squadre.filter((sq) => sq.girone === l),
          deiGironi
            .filter((m) => m.girone === l && m.stato === 'giocata')
            .map((m) => ({ chiaveA: m.chiaveA, chiaveB: m.chiaveB, golA: m.risultato?.golA, golB: m.risultato?.golB })),
          t.puntiVittoria ?? 3,
          t.puntiPareggio ?? 1,
        ).map((r) => r.chiave),
      )
      primoTurno = incrociGironi(classifiche, t.qualificate ?? 2)
      await sanity.patch(torneoId).set({ primoTurno }).commit()
    }
    chiavi = primoTurno.filter(Boolean)
  }
  const tab = tabellone(
    chiavi,
    partite.map((m) => ({ ...m, golA: m.risultato?.golA, golB: m.risultato?.golB })),
    primoTurno,
  )
  const nuovi = daCreare(tab)
  // Risultato corretto dopo: la partita del turno dopo (se non ancora giocata) prende le squadre giuste.
  const daCorreggere = tab
    .flat()
    .filter((i) => i.partita && i.a && i.b && i.partita.stato !== 'giocata' && (i.partita.chiaveA !== i.a || i.partita.chiaveB !== i.b))
  if (!nuovi.length && !daCorreggere.length) return
  const squadra = new Map(t.squadre.map((sq) => [sq._key, sq]))
  const tx = sanity.transaction()
  const adesso = new Date().toISOString()
  for (const i of daCorreggere) {
    const sa = squadra.get(i.a!)!
    const sb = squadra.get(i.b!)!
    const giocatori = [...sa.giocatori, ...sb.giocatori]
    tx.patch(i.partita!._id, (p) =>
      p.set({
        chiaveA: sa._key,
        chiaveB: sb._key,
        nomeA: sa.nome,
        nomeB: sb.nome,
        squadraA: sa.giocatori,
        squadraB: sb.giocatori,
        postiDisponibili: giocatori.length,
        convocazioni: giocatori.map((g) => ({ _key: g._ref, _type: 'convocazione', giocatore: { _type: 'reference', _ref: g._ref }, risposta: 'presente', rispostoIl: adesso })),
      }),
    )
  }
  nuovi.forEach((inc, k) => {
    // tutte lo stesso giorno: dopo tutte le partite già in calendario; altrimenti dopo quelle dello stesso turno
    const prima = t.calendario!.ogniGiorni === 0 ? tutte.length : partite.filter((m) => m.turno === inc.turno).length
    const giaNelTurno = nuovi.slice(0, k).filter((x) => t.calendario!.ogniGiorni !== 0 ? x.turno === inc.turno : true).length
    tx.create(
      partitaTorneo(t.legaId, torneoId, t.calendario!, squadra.get(inc.a!)!, squadra.get(inc.b!)!, {
        turno: inc.turno,
        giorno: giornateGironi + inc.turno,
        posizione: inc.posizione,
        slot: prima + giaNelTurno,
        ...(gironi && { fase: 'eliminazione' as const }),
      }),
    )
  })
  await tx.commit()
}

// Nuovo torneo: girone all'italiana, eliminazione diretta o gironi + tabellone, con squadre fisse dalla rosa.
// Le partite sono normali partite della lega (con squadre già fatte e senza convocazioni).
export async function creaTorneo(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireIn(str(formData, 'legaId'), 'organizzatore')
  if (!(await puoCreareTornei(admin.lega._id))) return { error: await tr('I tornei sono una funzione Pro.') }
  const utente = await getUtente()

  const nome = str(formData, 'nome')
  if (nome.length < 2 || nome.length > 60) return { error: await tr('Il nome del torneo deve avere tra 2 e 60 caratteri.') }
  const formati = ['girone', 'eliminazione', 'gironi'] as const
  const formato = formati.find((f) => f === str(formData, 'formato')) ?? 'girone'
  const quante = num(formData, 'numSquadre') ?? 0
  if (!Number.isInteger(quante) || quante < 2 || quante > SQUADRE_PREDEFINITE.length) {
    return { error: await tr('Servono da 2 a {n} squadre.', { n: SQUADRE_PREDEFINITE.length }) }
  }
  const squadre = await squadreDalModulo(formData, admin.lega._id, quante)
  if (typeof squadre === 'string') return { error: squadre }
  const maxGiocatori = maxDalModulo(formData)
  if (typeof maxGiocatori === 'string') return { error: await tr(maxGiocatori) }
  const troppi = maxGiocatori && squadre.find((sq) => sq.giocatori.length > maxGiocatori)
  if (troppi) return { error: await tr('{squadra} ha più di {n} giocatori.', { squadra: troppi.nome, n: maxGiocatori }) }
  // Tabellone: il primo turno come l'ha messo l'organizzatore (indici delle squadre, a due a due).
  let primoTurno: string[] | undefined
  if (formato === 'eliminazione') {
    let posti: unknown
    try {
      posti = JSON.parse(str(formData, 'primoTurno') || 'null')
    } catch {
      posti = null
    }
    primoTurno = Array.isArray(posti)
      ? posti.filter((i) => typeof i === 'number' && squadre[i]).map((i) => squadre[i]._key)
      : primoTurnoTeste(squadre.map((sq) => sq._key))
    if (!primoTurnoValido(primoTurno, squadre.map((sq) => sq._key))) return { error: await tr('Nel tabellone devono esserci tutte le squadre, una volta sola.') }
  }
  // Gironi + tabellone: girone di ogni squadra (girone_<i> = indice del girone) e quante passano da ognuno.
  const numGironi = num(formData, 'numGironi') ?? 2
  const qualificate = num(formData, 'qualificate') ?? 2
  if (formato === 'gironi') {
    if (!Number.isInteger(numGironi) || numGironi < 2 || numGironi > LETTERE_GIRONI.length) return { error: await tr('Servono da 2 a 8 gironi.') }
    squadre.forEach((sq, i) => {
      const g = num(formData, `girone_${i}`)
      sq.girone = LETTERE_GIRONI[g != null && Number.isInteger(g) && g >= 0 && g < numGironi ? g : i % numGironi]
    })
    const grandezze = LETTERE_GIRONI.slice(0, numGironi).map((l) => squadre.filter((sq) => sq.girone === l).length)
    if (grandezze.some((n) => n < 2)) return { error: await tr('Ogni girone deve avere almeno 2 squadre.') }
    if (![1, 2].includes(qualificate) || qualificate >= Math.min(...grandezze)) {
      return { error: await tr('Dai gironi devono passare 1 o 2 squadre, e non tutte quelle del girone.') }
    }
  }

  const inizio = str(formData, 'inizio')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(inizio)) return { error: await tr('Scegli giorno e ora della prima giornata.') }
  const ogniGiorni = num(formData, 'ogniGiorni') ?? 7
  if (![0, 1, 7, 14].includes(ogniGiorni)) return { error: await tr('Frequenza delle giornate non valida.') }
  const durataMinuti = num(formData, 'durataMinuti') ?? 40
  if (!Number.isInteger(durataMinuti) || durataMinuti < 10 || durataMinuti > 300) return { error: await tr('Durata non valida (10-300 minuti).') }
  const luogo = str(formData, 'luogo')
  if (!luogo) return { error: await tr('Scrivi dove si gioca.') }
  const andataRitorno = formato === 'girone' && formData.get('andataRitorno') === 'on'
  const calendario: CalendarioTorneo = { inizio, ogniGiorni, durataMinuti, luogo }

  const torneo = await sanity.create({
    _type: 'tournament',
    lega: { _type: 'reference', _ref: admin.lega._id },
    nome,
    formato,
    andataRitorno,
    puntiVittoria: 3,
    puntiPareggio: 1,
    calendario,
    squadre,
    ...(primoTurno && { primoTurno }),
    ...(formato === 'gironi' && { numGironi, qualificate }),
    ...(maxGiocatori && { maxGiocatori }),
    codiceInvito: await nuovoCodice(),
    ...(utente && { creatoDa: utente.id }),
  })

  if (formato === 'eliminazione') {
    await aggiornaTabellone(torneo._id)
  } else if (formato === 'gironi') {
    // Ogni girone tutti contro tutti; la giornata d di tutti i gironi si gioca lo stesso giorno, una partita dopo l'altra.
    const perGirone = LETTERE_GIRONI.slice(0, numGironi).map((l) => ({ l, squadre: squadre.filter((sq) => sq.girone === l) }))
    const calendari = perGirone.map((g) => giornate(g.squadre.length))
    const giornateTot = Math.max(...calendari.map((c) => c.length))
    let slot = 0
    const tx = sanity.transaction()
    for (let d = 0; d < giornateTot; d++) {
      let nelGiorno = 0
      perGirone.forEach((g, gi) =>
        (calendari[gi][d] ?? []).forEach(([a, b]) => {
          tx.create(
            partitaTorneo(admin.lega._id, torneo._id, calendario, g.squadre[a], g.squadre[b], {
              turno: d + 1,
              slot: ogniGiorni === 0 ? slot : nelGiorno,
              fase: 'gironi',
              girone: g.l,
            }),
          )
          slot++
          nelGiorno++
        }),
      )
    }
    await tx.commit()
  } else {
    let slot = 0
    const tx = sanity.transaction()
    giornate(quante, andataRitorno).forEach((coppie, g) =>
      coppie.forEach(([a, b], i) => {
        tx.create(partitaTorneo(admin.lega._id, torneo._id, calendario, squadre[a], squadre[b], { turno: g + 1, slot: ogniGiorni === 0 ? slot : i }))
        slot++
      }),
    )
    await tx.commit()
  }
  // Ai capitani: tocca a loro invitare i compagni.
  await Promise.all(
    squadre.map((sq) =>
      inviaAGiocatori([sq.capitano!._ref], (t) => ({
        title: `🏆 ${t('Sei il capitano dei {squadra}', { squadra: sq.nome })}`,
        body: t('Torneo {torneo}: invita i tuoi compagni con il link della squadra.', { torneo: nome }),
        url: `/tornei/${torneo._id}/squadra/${sq._key}`,
        tag: `capitano-${torneo._id}-${sq._key}`,
      })).catch(() => undefined),
    ),
  )
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/tornei/${torneo._id}`)
}

// Le partite non ancora giocate prendono nomi e giocatori aggiornati delle squadre.
function aggiornaPartiteDaGiocare(tx: ReturnType<typeof sanity.transaction>, partite: { _id: string; chiaveA: string; chiaveB: string }[], squadre: SquadraDoc[]) {
  const perChiave = new Map(squadre.map((sq) => [sq._key, sq]))
  const adesso = new Date().toISOString()
  for (const m of partite) {
    const sa = perChiave.get(m.chiaveA)
    const sb = perChiave.get(m.chiaveB)
    if (!sa || !sb) continue
    const giocatori = [...sa.giocatori, ...sb.giocatori]
    tx.patch(m._id, (p) =>
      p.set({
        nomeA: sa.nome,
        nomeB: sb.nome,
        squadraA: sa.giocatori,
        squadraB: sb.giocatori,
        postiDisponibili: giocatori.length,
        convocazioni: giocatori.map((g) => ({ _key: g._ref, _type: 'convocazione', giocatore: { _type: 'reference', _ref: g._ref }, risposta: 'presente', rispostoIl: adesso })),
      }),
    )
  }
}

const partiteDaGiocare = (torneoId: string) =>
  sanity.fetch<{ _id: string; chiaveA: string; chiaveB: string }[]>(
    `*[_type == "match" && torneo._ref == $id && !(stato in ["giocata", "annullata"])]{_id, chiaveA, chiaveB}`,
    { id: torneoId },
  )

// Limite facoltativo di giocatori per squadra (vuoto = nessun limite).
const ERRORE_MAX = 'Il limite di giocatori per squadra deve essere tra 1 e 50.'
function maxDalModulo(formData: FormData): number | null | string {
  const v = str(formData, 'maxGiocatori')
  if (!v) return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : ERRORE_MAX
}

// L'organizzatore cambia nomi, capitani e giocatori delle squadre: valgono anche per le partite non ancora giocate.
export async function salvaSquadreTorneo(torneoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireForDoc(torneoId, 'organizzatore')
  if (!(await puoCreareTornei(admin.lega._id))) return { error: await tr('I tornei sono una funzione Pro.') }
  const torneo = await sanity.fetch<{ _rev: string; squadre: SquadraDoc[] } | null>(`*[_type == "tournament" && _id == $id][0]{_rev, squadre}`, { id: torneoId })
  if (!torneo) return { error: await tr('Torneo non trovato.') }
  const max = maxDalModulo(formData)
  if (typeof max === 'string') return { error: await tr(max) }
  const squadre = await squadreDalModulo(formData, admin.lega._id, torneo.squadre.length, torneo.squadre)
  if (typeof squadre === 'string') return { error: squadre }
  const troppi = max && squadre.find((sq) => sq.giocatori.length > max)
  if (troppi) return { error: await tr('{squadra} ha più di {n} giocatori.', { squadra: troppi.nome, n: max }) }

  const tx = sanity.transaction().patch(torneoId, (p) => {
    p.ifRevisionId(torneo._rev).set({ squadre })
    return max ? p.set({ maxGiocatori: max }) : p.unset(['maxGiocatori'])
  })
  aggiornaPartiteDaGiocare(tx, await partiteDaGiocare(torneoId), squadre)
  await tx.commit()
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/tornei/${torneoId}`)
}

// L'organizzatore chiude (o riapre) le iscrizioni: i capitani non possono più invitare né cambiare la squadra.
export async function chiudiIscrizioni(torneoId: string, chiuse: boolean) {
  await requireForDoc(torneoId, 'organizzatore')
  await sanity.patch(torneoId).set({ iscrizioniChiuse: chiuse }).commit()
  refresh()
}

type TorneoSquadre = { _id: string; _rev: string; nome: string; legaId: string; maxGiocatori?: number; iscrizioniChiuse?: boolean; primaPartita?: string; squadre: SquadraDoc[] }
const torneoSquadreFields = `_id, _rev, nome, "legaId": lega._ref, maxGiocatori, iscrizioniChiuse, squadre,
  "primaPartita": *[_type == "match" && torneo._ref == ^._id] | order(data asc)[0].data`

// Entrare in una squadra con il link del capitano: chi non è nella lega ci entra, poi passa in quella squadra
// (lasciando quella in cui era nello stesso torneo).
export async function entraInSquadra(codice: string) {
  await entraConCodiceSquadra(codice)
}

async function entraConCodiceSquadra(codice: string, utente?: Utente) {
  const torneo = await sanity.fetch<TorneoSquadre | null>(
    `*[_type == "tournament" && $codice in squadre[].codiceInvito][0]{${torneoSquadreFields}}`,
    { codice: codice.toUpperCase() },
  )
  await entra(torneo, torneo?.squadre.find((sq) => sq.codiceInvito === codice.toUpperCase()), utente)
}

// Con il link del torneo si sceglie la squadra.
export async function entraNelTorneo(codice: string, chiave: string) {
  const torneo = await sanity.fetch<TorneoSquadre | null>(`*[_type == "tournament" && codiceInvito == $codice][0]{${torneoSquadreFields}}`, {
    codice: codice.toUpperCase(),
  })
  await entra(torneo, torneo?.squadre.find((sq) => sq._key === chiave))
}

async function entra(torneo: TorneoSquadre | null, squadra: SquadraDoc | undefined, aggiornato?: Utente) {
  const utente = aggiornato ?? (await getUtente())
  if (!utente) redirect('/sign-in')
  if (!torneo || !squadra) throw new Error('Invito non valido')
  if (!iscrizioniAperte(torneo)) throw new Error('Le iscrizioni a questo torneo sono chiuse')

  // la mia scheda nella lega (come con l'invito alla lega: chi era stato tolto rientra con la sua)
  let me = (await getMemberships()).find((m) => m.lega._id === torneo.legaId)?._id
  if (!me) {
    const vecchia = await sanity.fetch<string | null>(`*[_type == "player" && lega._ref == $lega && clerkUserId == $id][0]._id`, {
      lega: torneo.legaId,
      id: utente.id,
    })
    if (vecchia) await sanity.patch(vecchia).set({ attivo: true }).unset(['rimossoIl']).commit()
    else await nuovaScheda(torneo.legaId, utente, false)
    me = vecchia ?? `player-${torneo.legaId}-${utente.id}`
  }
  await attivaLega(torneo.legaId)

  if (!squadra.giocatori.some((g) => g._ref === me)) {
    if (torneo.maxGiocatori && squadra.giocatori.length >= torneo.maxGiocatori) throw new Error(`${squadra.nome} è al completo`)
    // un capitano non può lasciare la sua squadra con un invito
    if (torneo.squadre.some((sq) => sq._key !== squadra._key && sq.capitano?._ref === me)) {
      throw new Error('Sei il capitano di un’altra squadra di questo torneo')
    }
    const squadre = torneo.squadre.map((sq) => ({
      ...sq,
      giocatori:
        sq._key === squadra._key
          ? [...sq.giocatori, { _key: me!, _type: 'reference' as const, _ref: me! }]
          : sq.giocatori.filter((g) => g._ref !== me),
    }))
    const tx = sanity.transaction().patch(torneo._id, (p) => p.ifRevisionId(torneo._rev).set({ squadre }))
    aggiornaPartiteDaGiocare(tx, await partiteDaGiocare(torneo._id), squadre)
    await tx.commit()
    if (squadra.capitano) {
      await inviaAGiocatori([squadra.capitano._ref], (t) => ({
        title: `🏆 ${t('{nome} è nei {squadra}', { nome: utente.nome || t('Un giocatore'), squadra: squadra.nome })}`,
        body: t('È entrato nella tua squadra del torneo {torneo}.', { torneo: torneo.nome }),
        url: `/tornei/${torneo._id}`,
        tag: `squadra-${torneo._id}-${squadra._key}`,
      })).catch(() => undefined)
    }
  }
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/tornei/${torneo._id}`)
}

// Il capitano (o un organizzatore) gestisce la sua squadra: nome, foto, chi togliere (rimuovi_<giocatore>)
// e chi inserire dalla rosa (aggiungi_<giocatore>). Il capitano inserisce solo chi non è in un'altra squadra;
// l'organizzatore può anche spostare giocatori da un'altra squadra (non il suo capitano, e senza lasciarla vuota).
export async function salvaMiaSquadra(torneoId: string, chiave: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const torneo = await sanity.fetch<TorneoSquadre | null>(`*[_type == "tournament" && _id == $id][0]{${torneoSquadreFields}}`, { id: torneoId })
  const me = await membroDi(torneo?.legaId)
  const squadra = torneo?.squadre.find((sq) => sq._key === chiave)
  if (!torneo || !me || !squadra) return { error: await tr('Squadra non trovata.') }
  const organizzatore = !!me.isAdmin
  if (!organizzatore && squadra.capitano?._ref !== me._id) return { error: await tr('Solo il capitano può gestire la squadra.') }
  if (!organizzatore && !iscrizioniAperte(torneo)) return { error: await tr('Le iscrizioni sono chiuse: la squadra non si può più cambiare.') }

  const nome = str(formData, 'nome').slice(0, 30)
  if (nome.length < 2) return { error: await tr('Il nome della squadra deve avere almeno 2 caratteri.') }
  if (torneo.squadre.some((sq) => sq._key !== chiave && sq.nome.toLowerCase() === nome.toLowerCase())) return { error: await tr('C’è già una squadra con questo nome.') }

  const rosa = new Set(await sanity.fetch<string[]>(`*[_type == "player" && lega._ref == $lega && attivo != false]._id`, { lega: torneo.legaId }))
  const squadraDi = new Map(torneo.squadre.flatMap((sq) => sq.giocatori.map((g) => [g._ref, sq] as const)))
  const nuovi: string[] = []
  for (const [k, v] of formData) {
    if (!k.startsWith('aggiungi_') || v !== 'on') continue
    const id = k.slice('aggiungi_'.length)
    if (!rosa.has(id)) continue
    const altra = squadraDi.get(id)
    if (altra?._key === chiave) continue
    if (altra && !organizzatore) return { error: await tr('Un giocatore che hai scelto è già in un’altra squadra.') }
    if (altra?.capitano?._ref === id) return { error: await tr('Non puoi spostare il capitano dei {squadra}.', { squadra: altra.nome }) }
    nuovi.push(id)
  }
  const giocatori = [
    ...squadra.giocatori.filter((g) => g._ref === squadra.capitano?._ref || formData.get(`rimuovi_${g._ref}`) !== 'on'),
    ...nuovi.map((id) => ({ _key: id, _type: 'reference' as const, _ref: id })),
  ]
  if (!giocatori.length) return { error: await tr('La squadra deve avere almeno un giocatore.') }
  if (torneo.maxGiocatori && giocatori.length > torneo.maxGiocatori) return { error: await tr('Al massimo {n} giocatori per squadra.', { n: torneo.maxGiocatori }) }
  const upload = await uploadFoto(formData.get('foto'))
  if (upload && 'error' in upload) return upload

  const spostati = new Set(nuovi)
  const squadre = torneo.squadre.map((sq) =>
    sq._key === chiave
      ? { ...sq, nome, giocatori, ...(upload && { logo: upload.foto }) }
      : { ...sq, giocatori: sq.giocatori.filter((g) => !spostati.has(g._ref)) },
  )
  const vuota = squadre.find((sq) => !sq.giocatori.length)
  if (vuota) return { error: await tr('I {squadra} resterebbero senza giocatori.', { squadra: vuota.nome }) }
  const tx = sanity.transaction().patch(torneo._id, (p) => p.ifRevisionId(torneo._rev).set({ squadre }))
  aggiornaPartiteDaGiocare(tx, await partiteDaGiocare(torneo._id), squadre)
  await tx.commit()
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect(`/tornei/${torneoId}`)
}

// Link d'invito per una squadra che non l'ha ancora (tornei creati prima dei capitani): serve anche un capitano.
export async function creaLinkSquadra(torneoId: string, chiave: string) {
  const torneo = await sanity.fetch<TorneoSquadre | null>(`*[_type == "tournament" && _id == $id][0]{${torneoSquadreFields}}`, { id: torneoId })
  const me = await membroDi(torneo?.legaId)
  const squadra = torneo?.squadre.find((sq) => sq._key === chiave)
  if (!torneo || !me || !squadra) throw new Error('Squadra non trovata')
  if (!me.isAdmin && squadra.capitano?._ref !== me._id) throw new Error('Solo il capitano o un organizzatore')
  if (squadra.codiceInvito) return refresh()
  const codiceInvito = await nuovoCodiceSquadra(new Set(torneo.squadre.map((sq) => sq.codiceInvito).filter(Boolean) as string[]))
  const capitano = squadra.capitano ?? (squadra.giocatori[0] && { _type: 'reference' as const, _ref: squadra.giocatori[0]._ref })
  const squadre = torneo.squadre.map((sq) => (sq._key === chiave ? { ...sq, codiceInvito, ...(capitano && { capitano }) } : sq))
  await sanity.patch(torneo._id).ifRevisionId(torneo._rev).set({ squadre }).commit()
  refresh()
}

// Impostazioni del torneo che si possono cambiare dopo averlo creato (formato, squadre e calendario no):
// nome, campo e durata (anche per le partite non ancora giocate), punti e giocatori per squadra.
export async function salvaTorneo(torneoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireForDoc(torneoId, 'organizzatore')
  if (!(await puoCreareTornei(admin.lega._id))) return { error: await tr('I tornei sono una funzione Pro.') }
  const torneo = await getTorneo(torneoId)
  if (!torneo) return { error: await tr('Torneo non trovato.') }

  const nome = str(formData, 'nome')
  if (nome.length < 2 || nome.length > 60) return { error: await tr('Il nome del torneo deve avere tra 2 e 60 caratteri.') }
  const luogo = str(formData, 'luogo')
  if (!luogo) return { error: await tr('Scrivi dove si gioca.') }
  const durataMinuti = num(formData, 'durataMinuti') ?? 40
  if (!Number.isInteger(durataMinuti) || durataMinuti < 10 || durataMinuti > 300) return { error: await tr('Durata non valida (10-300 minuti).') }
  const puntiVittoria = num(formData, 'puntiVittoria') ?? 3
  const puntiPareggio = num(formData, 'puntiPareggio') ?? 1
  const punti = (n: number) => Number.isInteger(n) && n >= 0 && n <= 10
  if (!punti(puntiVittoria) || !punti(puntiPareggio) || puntiPareggio > puntiVittoria) return { error: await tr('Punti non validi: da 0 a 10, e il pareggio non più della vittoria.') }
  const maxGiocatori = maxDalModulo(formData)
  if (typeof maxGiocatori === 'string') return { error: await tr(maxGiocatori) }
  const troppi = maxGiocatori && torneo.squadre.find((sq) => sq.giocatori.length > maxGiocatori)
  if (troppi) return { error: await tr('{squadra} ha più di {n} giocatori.', { squadra: troppi.nome, n: maxGiocatori }) }

  const patch = sanity.patch(torneoId).set({
    nome,
    puntiVittoria,
    puntiPareggio,
    ...(torneo.calendario && { calendario: { ...torneo.calendario, luogo, durataMinuti } }),
    ...(maxGiocatori && { maxGiocatori }),
  })
  if (!maxGiocatori) patch.unset(['maxGiocatori'])
  const tx = sanity.transaction().patch(patch)
  const daGiocare = await sanity.fetch<string[]>(
    `*[_type == "match" && torneo._ref == $id && !(stato in ["giocata", "annullata"]) && data > now()]._id`,
    { id: torneoId },
  )
  for (const id of daGiocare) tx.patch(id, (p) => p.set({ luogo, durataMinuti }))
  await tx.commit()
  refresh()
  return {}
}

// Link e codice d'invito del torneo: si creano la prima volta, poi si possono cambiare (i vecchi smettono di funzionare).
export async function invitoTorneo(torneoId: string) {
  await requireForDoc(torneoId, 'organizzatore')
  await sanity.patch(torneoId).set({ codiceInvito: await nuovoCodice() }).commit()
  refresh()
}

// ---------- Importazione da Excel ----------

export type RigaImport = { nome?: string; cognome?: string; email?: string; telefono?: string; soprannome?: string; numero?: string; ruolo?: string; torneo?: string; squadra?: string }
export type EsitoImport = {
  error?: string
  creati?: number
  riattivati?: number
  giaPresenti?: number
  inSquadra?: number
  /** Inviti mandati per email (a chi non ha ancora un account). */
  invitati?: number
  righe?: { riga: number; esito: 'creato' | 'riattivato' | 'presente' | 'errore'; nome: string; nota?: string }[]
}

// Numero di maglia letto da un file: intero da 0 a 99 ("10", "#10", "10.0"); altrimenti niente.
function numeroMaglia(x: unknown) {
  const s = String(x ?? '').trim().replace(/^#/, '')
  const n = Number(s)
  return s !== '' && Number.isInteger(n) && n >= 0 && n <= 99 ? n : null
}

// L'organizzatore carica un elenco di giocatori (da Excel o CSV) in una sua lega, e se vuole li mette in una
// squadra di un torneo (la stessa per tutti, oppure quella scritta nella colonna "Squadra"). Chi è già in rosa
// (stessa email, o stesso nome e cognome) non viene duplicato; quando un giocatore si registra con la stessa
// email, la sua scheda si collega da sola al suo account.
export async function importaGiocatori(
  legaId: string,
  torneoId: string | null,
  squadraKey: string | null,
  righe: RigaImport[],
  invita = false,
): Promise<EsitoImport> {
  const { lega } = await requireIn(legaId, 'organizzatore')
  if (!Array.isArray(righe) || righe.length === 0) return { error: await tr('Il file non contiene giocatori.') }
  if (righe.length > 300) return { error: await tr('Al massimo 300 giocatori per volta.') }
  const testo = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
  const pulite = righe.map((r) => ({
    nome: testo(r.nome, 40),
    cognome: testo(r.cognome, 40),
    email: testo(r.email, 120).toLowerCase(),
    telefono: testo(r.telefono, 30),
    soprannome: testo(r.soprannome, 30),
    // numero di maglia: solo un intero da 0 a 99 (es. "10", "#10", "10.0" da Excel)
    numero: numeroMaglia(r.numero),
    ruolo: leggiRuolo(testo(r.ruolo, 30), lega.club),
    torneo: testo(r.torneo, 60),
    squadra: testo(r.squadra, 60),
  }))

  const rosa = await sanity.fetch<{ _id: string; nome: string; cognome?: string; email?: string; attivo?: boolean; numero?: number }[]>(
    `*[_type == "player" && lega._ref == $legaId]{_id, nome, cognome, email, attivo, numero}`,
    { legaId },
  )
  const chiaveNome = (n: string, c: string) => `${n} ${c}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
  const perEmail = new Map(rosa.filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p]))
  const perNome = new Map(rosa.map((p) => [chiaveNome(p.nome, p.cognome ?? ''), p]))

  // tornei: quello scelto nella pagina e/o quelli scritti nella colonna "Torneo" (per nome, nella lega)
  const usaTornei = !!torneoId || pulite.some((r) => r.torneo)
  const tornei = usaTornei ? await sanity.fetch<TorneoSquadre[]>(`*[_type == "tournament" && lega._ref == $legaId]{${torneoSquadreFields}}`, { legaId }) : []
  if (usaTornei && !(await puoCreareTornei(legaId))) return { error: await tr('I tornei sono una funzione Pro.') }
  if (torneoId && !tornei.some((x) => x._id === torneoId)) return { error: await tr('Torneo non trovato.') }
  const torneoPerNome = new Map(tornei.map((x) => [x.nome.trim().toLowerCase(), x]))

  const tx = sanity.transaction()
  const esiti: NonNullable<EsitoImport['righe']> = []
  const daMettere: { id: string; torneo: string | null; squadra: string | null; riga: number }[] = []
  const visti = new Set<string>()
  for (const [i, r] of pulite.entries()) {
    const riga = i + 2 // la riga 1 del file è l'intestazione
    const etichetta = [r.nome, r.cognome].filter(Boolean).join(' ') || r.email
    if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) {
      esiti.push({ riga, esito: 'errore', nome: etichetta, nota: await tr('Email non valida') })
      continue
    }
    const nome = r.nome || (r.email ? r.email.split('@')[0] : '')
    if (!nome) {
      esiti.push({ riga, esito: 'errore', nome: '—', nota: await tr('Manca il nome o l’email') })
      continue
    }
    const esistente = (r.email && perEmail.get(r.email)) || perNome.get(chiaveNome(nome, r.cognome))
    let id: string
    if (esistente) {
      id = esistente._id
      if (visti.has(id)) continue
      // chi è già in rosa prende il numero di maglia del file, se c'è
      const nuovoNumero = r.numero != null && esistente.numero !== r.numero ? r.numero : null
      if (esistente.attivo === false) {
        tx.patch(id, (p) => p.set({ attivo: true, ...(nuovoNumero != null && { numero: nuovoNumero }) }).unset(['rimossoIl']))
        esiti.push({ riga, esito: 'riattivato', nome: etichetta })
      } else {
        if (nuovoNumero != null) tx.patch(id, (p) => p.set({ numero: nuovoNumero }))
        esiti.push({ riga, esito: 'presente', nome: etichetta, ...(nuovoNumero != null && { nota: `#${nuovoNumero}` }) })
      }
    } else {
      id = `player-${randomUUID()}`
      tx.create({
        _id: id,
        _type: 'player',
        lega: { _type: 'reference', _ref: legaId },
        nome,
        ...(r.cognome && { cognome: r.cognome }),
        ...(r.soprannome && { soprannome: r.soprannome }),
        ...(r.numero != null && { numero: r.numero }),
        ...(r.email && { email: r.email }),
        ...(r.telefono && { telefono: normalizzaTelefono(r.telefono) }),
        ...(r.ruolo && { ruolo: r.ruolo }),
        isAdmin: false,
        attivo: true,
        caratteristiche: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 5])),
      })
      const nuovo = { _id: id, nome, cognome: r.cognome, email: r.email, attivo: true }
      if (r.email) perEmail.set(r.email, nuovo)
      perNome.set(chiaveNome(nome, r.cognome), nuovo)
      esiti.push({ riga, esito: 'creato', nome: etichetta })
    }
    visti.add(id)
    if (usaTornei) daMettere.push({ id, torneo: r.torneo || null, squadra: r.squadra || null, riga })
  }

  // Squadre: il torneo della riga (colonna "Torneo") o quello scelto; la squadra della riga (per nome) o quella scelta.
  // Chi era in un'altra squadra dello stesso torneo cambia squadra.
  let inSquadra = 0
  const squadreDi = new Map<string, SquadraDoc[]>()
  for (const m of daMettere) {
    const esito = esiti.find((e) => e.riga === m.riga)
    const torneo = m.torneo ? torneoPerNome.get(m.torneo.toLowerCase()) : tornei.find((x) => x._id === torneoId)
    if (!torneo) {
      if (m.torneo && esito) esito.nota = await tr('Torneo “{torneo}” non trovato', { torneo: m.torneo })
      continue
    }
    let squadre = squadreDi.get(torneo._id) ?? torneo.squadre
    const chiave =
      (m.squadra && squadre.find((sq) => sq.nome.trim().toLowerCase() === m.squadra!.toLowerCase())?._key) || (torneo._id === torneoId ? squadraKey : null)
    if (!chiave) {
      if (m.squadra && esito) esito.nota = await tr('Squadra “{squadra}” non trovata in {torneo}', { squadra: m.squadra, torneo: torneo.nome })
      continue
    }
    const dest = squadre.find((sq) => sq._key === chiave)!
    if (dest.giocatori.some((g) => g._ref === m.id)) continue
    if (squadre.some((sq) => sq._key !== chiave && sq.capitano?._ref === m.id)) {
      if (esito) esito.nota = await tr('Capitano di un’altra squadra: non spostato')
      continue
    }
    if (torneo.maxGiocatori && dest.giocatori.length >= torneo.maxGiocatori) {
      if (esito) esito.nota = await tr('{squadra} è al completo', { squadra: dest.nome })
      continue
    }
    squadre = squadre.map((sq) => ({
      ...sq,
      giocatori: sq._key === chiave ? [...sq.giocatori, { _key: m.id, _type: 'reference' as const, _ref: m.id }] : sq.giocatori.filter((g) => g._ref !== m.id),
    }))
    squadreDi.set(torneo._id, squadre)
    if (esito) esito.nota = `${torneo.nome} · ${dest.nome}`
    inSquadra++
  }
  for (const [id, squadre] of squadreDi) {
    const torneo = tornei.find((x) => x._id === id)!
    tx.patch(id, (p) => p.ifRevisionId(torneo._rev).set({ squadre }))
    aggiornaPartiteDaGiocare(tx, await partiteDaGiocare(id), squadre)
  }

  await tx.commit()

  // Invito per email (Clerk, dal dominio dell'app) a chi non ha ancora un account: si registra e arriva al link
  // d'invito della lega. Chi ha già un account con quella email ritrova la scheda da solo al prossimo accesso.
  let invitati = 0
  if (invita) {
    const codice = await sanity.fetch<string | null>(`*[_id == $legaId][0].codiceInvito`, { legaId })
    const { clerkClient } = await import('@clerk/nextjs/server')
    const clerk = await clerkClient()
    const daInvitare = esiti.filter((e) => e.esito !== 'errore' && e.esito !== 'presente')
    for (const e of daInvitare) {
      const email = pulite[e.riga - 2]?.email
      if (!email) continue
      try {
        await clerk.invitations.createInvitation({ emailAddress: email, redirectUrl: codice ? `${SITO}/invito/${codice}` : SITO, expiresInDays: 30 })
        invitati++
        e.nota = [e.nota, await tr('invito mandato')].filter(Boolean).join(' · ')
      } catch {
        // email già registrata o già invitata: niente doppioni
        e.nota = [e.nota, await tr('ha già un account o un invito')].filter(Boolean).join(' · ')
      }
    }
  }

  refresh()
  return {
    invitati,
    creati: esiti.filter((e) => e.esito === 'creato').length,
    riattivati: esiti.filter((e) => e.esito === 'riattivato').length,
    giaPresenti: esiti.filter((e) => e.esito === 'presente').length,
    inSquadra,
    righe: esiti,
  }
}

// Elimina il torneo con tutte le sue partite (anche quelle già giocate).
export async function eliminaTorneo(torneoId: string) {
  await requireForDoc(torneoId, 'organizzatore')
  const partite = await sanity.fetch<string[]>(`*[_type == "match" && torneo._ref == $id]._id`, { id: torneoId })
  const tx = sanity.transaction()
  for (const id of partite) tx.delete(id)
  tx.delete(torneoId)
  await tx.commit()
  // svuota la memoria delle pagine dell'app: riaprendo una pagina (es. Modifica) si vedono i dati nuovi
  revalidatePath('/', 'layout')
  redirect('/tornei')
}

// Dopo un acquisto o un ripristino nell'app: risincronizza subito il mio abbonamento Pro
// (senza aspettare il webhook di RevenueCat) e aggiorna la pagina.
export async function aggiornaPro(): Promise<FormState> {
  const utente = await getUtente()
  if (!utente) return { error: await tr('Devi aver fatto l’accesso.') }
  try {
    await sincronizzaAbbonamento(utente.id, utente.emails[0])
  } catch {
    return { error: await tr('Non riesco a verificare l’abbonamento. Riprova tra qualche minuto.') }
  }
  refresh()
}
