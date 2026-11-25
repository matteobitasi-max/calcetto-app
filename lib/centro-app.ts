import 'server-only'
import { sanity } from './sanity'
import { addMinuti, isoToRomeLocal, romeLocalToISO } from './dates'
import { OCCUPANO, campiAttivi, chiaveGruppo, gruppi, minuti, hhmm, prezzoPer, type Centro, type Gruppo } from './centro'
import { inviaAGiocatori, inviaAUtenti } from './push'

// Il collegamento tra l'app dei giocatori e il gestionale del centro: il "ponte" è il posto sulla mappa
// (placeId di Google). Chi crea una partita in un centro che è su The Cap può prenotare il campo: sceglie il
// tipo (a 5, 7, 11; dentro o fuori), l'app trova un campo libero e il centro conferma (o conferma da solo).

const centroFields = `_id, nome, indirizzo, posto, telefono, "apre": coalesce(apre, "08:00"), "chiude": coalesce(chiude, "24:00"),
  "campi": coalesce(campi, []), "gestori": coalesce(gestori, []), "prenotazioniApp": coalesce(prenotazioniApp, "richiesta")`

export type CentroPubblico = { id: string; nome: string; modo: Centro['prenotazioniApp']; apre: string; chiude: string; gruppi: Gruppo[] }

export async function centroDaPosto(placeId: string): Promise<Centro | null> {
  if (!/^[\w-]{10,300}$/.test(placeId)) return null
  return sanity.fetch<Centro | null>(`*[_type == "centro" && posto.placeId == $p][0]{${centroFields}}`, { p: placeId })
}

export const pubblico = (c: Centro): CentroPubblico => ({ id: c._id, nome: c.nome, modo: c.prenotazioniApp, apre: c.apre, chiude: c.chiude, gruppi: gruppi(c) })

async function getCentro(id: string) {
  return sanity.fetch<Centro | null>(`*[_type == "centro" && _id == $id][0]{${centroFields}}`, { id })
}

// Quello che occupa i campi per chi prenota dall'app: le prenotazioni e gli orari esclusi dal centro.
function occupate(centroId: string, da: string, a: string, tranne?: string) {
  return sanity.fetch<{ campo: string; inizio: string; fine: string }[]>(
    `*[((_type == "prenotazione" && coalesce(stato, "confermata") in ${OCCUPANO}) || _type == "bloccoApp")
      && centro._ref == $centro && inizio < $a && fine > $da ${tranne ? '&& _id != $tranne' : ''}]{campo, inizio, fine}`,
    { centro: centroId, da, a, ...(tranne && { tranne }) },
  )
}

// Un campo del gruppo libero in quell'orario (il primo, nell'ordine dei campi), o null.
async function campoLibero(centro: Centro, gruppo: string, inizio: string, fine: string, tranne?: string) {
  const prese = await occupate(centro._id, inizio, fine, tranne)
  const occupati = new Set(prese.map((p) => p.campo))
  return campiAttivi(centro).find((c) => chiaveGruppo(c) === gruppo && !occupati.has(c._key)) ?? null
}

// Gli orari di inizio (ogni mezz'ora) in cui almeno un campo del gruppo è libero per tutta la durata.
export async function orariLiberi(centro: Centro, gruppo: string, giorno: string, durata: number) {
  const campi = campiAttivi(centro).filter((c) => chiaveGruppo(c) === gruppo)
  if (!campi.length) return []
  const prese = await occupate(centro._id, romeLocalToISO(`${giorno}T00:00`), romeLocalToISO(addMinuti(`${giorno}T00:00`, 24 * 60)))
  const adesso = Date.now()
  const liberi: string[] = []
  for (let m = minuti(centro.apre); m + durata <= minuti(centro.chiude); m += 30) {
    const inizio = romeLocalToISO(`${giorno}T${hhmm(m)}`)
    const fine = romeLocalToISO(addMinuti(`${giorno}T${hhmm(m)}`, durata))
    if (Date.parse(inizio) < adesso) continue
    const libero = campi.some((c) => !prese.some((p) => p.campo === c._key && p.inizio < fine && p.fine > inizio))
    if (libero) liberi.push(hhmm(m))
  }
  return liberi
}

type Richiesta = { centroId: string; gruppo: string; inizio: string; durata: number }

// Prima di creare la partita: il centro accetta prenotazioni dall'app e c'è un campo libero a quell'ora?
export async function verificaPrenotazione(r: Richiesta): Promise<{ centro: Centro } | { errore: string }> {
  const centro = await getCentro(r.centroId)
  if (!centro || centro.prenotazioniApp === 'spente') return { errore: 'Questo centro non accetta prenotazioni dall’app: contattalo direttamente.' }
  const ora = isoToRomeLocal(r.inizio).slice(11)
  if (minuti(ora) < minuti(centro.apre) || minuti(ora) + r.durata > minuti(centro.chiude)) {
    return { errore: `Il centro è aperto dalle ${centro.apre} alle ${centro.chiude}.` }
  }
  const fine = new Date(Date.parse(r.inizio) + r.durata * 60_000).toISOString()
  if (!(await campoLibero(centro, r.gruppo, r.inizio, fine))) {
    const liberi = await orariLiberi(centro, r.gruppo, isoToRomeLocal(r.inizio).slice(0, 10), r.durata)
    return { errore: liberi.length ? `A quell’ora il campo non è libero. Liberi: ${liberi.slice(0, 8).join(', ')}.` : 'Quel giorno non ci sono campi liberi di questo tipo.' }
  }
  return { centro }
}

// Crea la prenotazione per la partita (confermata o da confermare) e avvisa i gestori del centro.
export async function prenotaPerPartita(
  centro: Centro,
  r: Richiesta & { matchId: string; legaId: string; legaNome: string; organizzatoreId: string; organizzatore: string; telefono?: string },
) {
  const fine = new Date(Date.parse(r.inizio) + r.durata * 60_000).toISOString()
  const campo = await campoLibero(centro, r.gruppo, r.inizio, fine)
  if (!campo) return null
  const stato = centro.prenotazioniApp === 'auto' ? 'confermata' : 'richiesta'
  const doc = await sanity.create({
    _type: 'prenotazione',
    centro: { _type: 'reference', _ref: centro._id },
    campo: campo._key,
    inizio: r.inizio,
    fine,
    cliente: r.legaNome.slice(0, 80),
    ...(r.telefono && { telefono: r.telefono }),
    nota: `📱 Prenotata dall’app da ${r.organizzatore}`,
    prezzo: prezzoPer(campo, r.durata),
    stato,
    lega: { _type: 'reference', _ref: r.legaId, _weak: true },
    match: { _type: 'reference', _ref: r.matchId, _weak: true },
    organizzatore: { _type: 'reference', _ref: r.organizzatoreId, _weak: true },
  })
  const quando = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(r.inizio))
  await inviaAUtenti(centro.gestori, {
    title: stato === 'richiesta' ? `📥 Nuova richiesta · ${campo.nome}` : `📅 Nuova prenotazione dall’app · ${campo.nome}`,
    body: `${r.legaNome} · ${quando}${stato === 'richiesta' ? ' · da confermare' : ''}`,
    url: `/centro/prenotazione/${doc._id}`,
    tag: `prenotazione-${doc._id}`,
  }).catch(() => undefined)
  return { id: doc._id, stato }
}

// La partita cambia orario: la prenotazione si sposta (sullo stesso tipo di campo), se c'è posto.
export async function spostaPrenotazione(prenotazioneId: string, inizio: string, durata: number): Promise<string | null> {
  const p = await sanity.fetch<{ centro: string; campo: string; inizio: string; fine: string; stato?: string } | null>(
    `*[_type == "prenotazione" && _id == $id][0]{"centro": centro._ref, campo, inizio, fine, stato}`,
    { id: prenotazioneId },
  )
  if (!p || !['confermata', 'richiesta', undefined].includes(p.stato)) return null
  const fine = new Date(Date.parse(inizio) + durata * 60_000).toISOString()
  if (p.inizio === inizio && p.fine === fine) return null
  const centro = await getCentro(p.centro)
  if (!centro) return null
  const attuale = centro.campi.find((c) => c._key === p.campo)
  const campo = attuale ? await campoLibero(centro, chiaveGruppo(attuale), inizio, fine, prenotazioneId) : null
  if (!campo) return 'Il centro non ha un campo libero al nuovo orario: scegli un altro orario o annulla la prenotazione.'
  await sanity.patch(prenotazioneId).set({ campo: campo._key, inizio, fine, prezzo: prezzoPer(campo, durata) }).commit()
  await inviaAUtenti(centro.gestori, {
    title: `🔁 Prenotazione spostata · ${campo.nome}`,
    body: new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(inizio)),
    url: `/centro/prenotazione/${prenotazioneId}`,
    tag: `prenotazione-${prenotazioneId}`,
  }).catch(() => undefined)
  return null
}

// La partita è annullata: il campo torna libero e il centro lo sa.
export async function liberaPerPartita(matchId: string) {
  const p = await sanity.fetch<{ _id: string; centro: string; cliente: string; inizio: string } | null>(
    `*[_type == "prenotazione" && match._ref == $m && coalesce(stato, "confermata") in ${OCCUPANO}][0]{_id, "centro": centro._ref, cliente, inizio}`,
    { m: matchId },
  )
  if (!p) return
  await sanity.patch(p._id).set({ stato: 'annullata' }).commit()
  const gestori = await sanity.fetch<string[]>(`*[_type == "centro" && _id == $id][0].gestori`, { id: p.centro })
  await inviaAUtenti(gestori ?? [], {
    title: `❌ Prenotazione annullata · ${p.cliente}`,
    body: `${new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(p.inizio))} · la partita è stata annullata, il campo è di nuovo libero`,
    url: `/centro/prenotazione/${p._id}`,
    tag: `prenotazione-${p._id}`,
  }).catch(() => undefined)
}

// Il centro risponde (conferma, rifiuta o annulla): l'organizzatore della partita viene avvisato.
export async function avvisaOrganizzatore(p: { organizzatoreId?: string; matchId?: string }, centro: string, esito: 'confermata' | 'rifiutata' | 'annullata', quando: string) {
  if (!p.organizzatoreId) return
  await inviaAGiocatori([p.organizzatoreId], (t) => ({
    title:
      esito === 'confermata'
        ? `✅ ${t('Campo confermato da {centro}', { centro })}`
        : esito === 'rifiutata'
          ? `❌ ${t('{centro} non può darti il campo', { centro })}`
          : `❌ ${t('{centro} ha annullato la prenotazione', { centro })}`,
    body: esito === 'confermata' ? quando : t('{quando}: scegli un altro orario o un altro campo.', { quando }),
    url: p.matchId ? `/partite/${p.matchId}` : '/',
    tag: `campo-${p.matchId ?? centro}`,
  })).catch(() => undefined)
}

// ---------- Collegamento per email ----------

// L'account The Cap con questa email (verificata), se c'è.
export async function utenteDaEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  const { clerkClient } = await import('@clerk/nextjs/server')
  const trovati = await (await clerkClient()).users.getUserList({ emailAddress: [email.toLowerCase()], limit: 1 }).catch(() => null)
  return trovati?.data[0]?.id ?? null
}

const MARGINE = 45 * 60_000

// La partita di questo utente (in una delle sue leghe) in quel centro e a quell'ora, non ancora collegata:
// stesso posto sulla mappa (o stesso nome scritto), inizio entro 45 minuti dalla prenotazione.
async function partitaDi(utente: string, centro: { _id: string; nome: string; posto?: { placeId: string } }, inizio: string) {
  const schede = await sanity.fetch<{ _id: string; lega: string }[]>(
    `*[_type == "player" && clerkUserId == $u && attivo != false && defined(lega._ref)]{_id, "lega": lega._ref}`,
    { u: utente },
  )
  if (!schede.length) return null
  const t = Date.parse(inizio)
  const m = await sanity.fetch<{ _id: string; lega: string; legaNome: string } | null>(
    `*[_type == "match" && lega._ref in $leghe && coalesce(stato, "aperta") != "annullata" && !defined(prenotazione)
      && data >= $da && data <= $a && (campo.placeId == $posto || lower(luogo) == $nome)] | order(data asc)[0]{_id, "lega": lega._ref, "legaNome": lega->nome}`,
    {
      leghe: schede.map((s) => s.lega),
      da: new Date(t - MARGINE).toISOString(),
      a: new Date(t + MARGINE).toISOString(),
      posto: centro.posto?.placeId ?? '-',
      nome: centro.nome.trim().toLowerCase(),
    },
  )
  if (!m) return null
  return { ...m, organizzatoreId: schede.find((s) => s.lega === m.lega)!._id }
}

// Una prenotazione scritta dal centro con l'email di chi prenota: se quella persona ha la partita su The Cap
// in quel centro a quell'ora, si collegano (la partita mostra il campo confermato, e da lì in poi si muovono
// insieme). Se ha l'account ma non ancora la partita, la prenotazione aspetta: si collega quando la crea.
export async function collegaPerEmail(prenotazioneId: string, email: string, centro: { _id: string; nome: string; posto?: { placeId: string } }, inizio: string) {
  const utente = await utenteDaEmail(email)
  if (!utente) return 'nessuno' as const
  const m = await partitaDi(utente, centro, inizio)
  if (!m) {
    await sanity.patch(prenotazioneId).set({ utente }).commit()
    return 'utente' as const
  }
  await sanity
    .transaction()
    .patch(prenotazioneId, (p) =>
      p.set({
        utente,
        lega: { _type: 'reference', _ref: m.lega, _weak: true },
        match: { _type: 'reference', _ref: m._id, _weak: true },
        organizzatore: { _type: 'reference', _ref: m.organizzatoreId, _weak: true },
      }),
    )
    .patch(m._id, (p) => p.set({ prenotazione: { _type: 'reference', _ref: prenotazioneId, _weak: true } }))
    .commit()
  await avvisaOrganizzatore({ organizzatoreId: m.organizzatoreId, matchId: m._id }, centro.nome, 'confermata', new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(inizio)))
  return 'collegata' as const
}

// Al contrario: chi crea una partita in un centro dove il centro gli ha già registrato una prenotazione
// (con la sua email) a quell'ora, se la ritrova collegata invece di prenotarne un'altra.
export async function prenotazioneRegistrata(r: { placeId: string; utente: string; inizio: string }) {
  const centro = await centroDaPosto(r.placeId)
  if (!centro) return null
  const t = Date.parse(r.inizio)
  const p = await sanity.fetch<string | null>(
    `*[_type == "prenotazione" && centro._ref == $c && utente == $u && !defined(match) && coalesce(stato, "confermata") in ${OCCUPANO}
      && inizio >= $da && inizio <= $a] | order(inizio asc)[0]._id`,
    { c: centro._id, u: r.utente, da: new Date(t - MARGINE).toISOString(), a: new Date(t + MARGINE).toISOString() },
  )
  return p
}

export async function collegaPrenotazione(p: string, r: { matchId: string; legaId: string; organizzatoreId: string }) {
  await sanity
    .transaction()
    .patch(p, (q) =>
      q.set({
        lega: { _type: 'reference', _ref: r.legaId, _weak: true },
        match: { _type: 'reference', _ref: r.matchId, _weak: true },
        organizzatore: { _type: 'reference', _ref: r.organizzatoreId, _weak: true },
      }),
    )
    .patch(r.matchId, (q) => q.set({ prenotazione: { _type: 'reference', _ref: p, _weak: true } }))
    .commit()
}
