'use server'

import { randomInt, randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { sanity } from '@/lib/sanity'
import { BADGE, CATEGORIE_NOTIFICHE, COOKIE_LEGA, normalizzaTelefono, PIEDI, RUOLI, SKILLS, displayName, requirePlayer, getUtente, membroDi, requireAdmin, requireForDoc, requireIn, type Player, type Skill } from '@/lib/player'
import { assegnaPosti, finestra, getMatch, presenti, risultatoDa, type Match, type Risposta, type Stato } from '@/lib/matches'
import { MAX_GIOCATORI, MAX_ISCRITTI, formatoDaIscritti } from '@/lib/limiti'
import { riscriviPartita, type MatchDaUnire } from '@/lib/unisci'
import { daysBetween, formatData, romeLocalToISO } from '@/lib/dates'
import { inviaAGiocatori, inviaATutti, rimuoviIscrizione, salvaIscrizione, salvaTokenNativo, type PushSub } from '@/lib/push'
import { assicuraRicorrenze, getSeries, occurrenceId, rimuoviFutureVuote, type Series } from '@/lib/series'

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
  const player = await requireForDoc(matchId)

  // Lettura-modifica-scrittura con controllo di revisione: se due giocatori
  // rispondono nello stesso istante, il secondo riprova sui dati aggiornati.
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await sanity.fetch<
      (Pick<Match, '_rev' | 'stato' | 'aperturaConvocazioni' | 'chiusuraConvocazioni' | 'postiDisponibili'> & {
        convocazioni?: RawConvocazione[]
      }) | null
    >(
      `*[_type == "match" && _id == $id][0]{_rev, stato, aperturaConvocazioni, chiusuraConvocazioni, postiDisponibili, convocazioni}`,
      { id: matchId },
    )
    if (!doc) throw new Error('Partita non trovata')
    if (finestra(doc) !== 'aperta') throw new Error('Le convocazioni non sono aperte')

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
  // Nuova partita: nella lega attiva. Modifica: nella lega della partita.
  const admin = matchId ? await requireForDoc(matchId, 'organizzatore') : await requireAdmin()
  const lega = { _type: 'reference' as const, _ref: admin.lega._id }
  const luogo = str(formData, 'luogo')
  const [data, apertura, chiusura] = ['data', 'aperturaConvocazioni', 'chiusuraConvocazioni'].map((k) => {
    const v = str(formData, k)
    return v ? romeLocalToISO(v) : ''
  })
  const automatici = formData.get('postiAutomatici') === 'on'
  let posti = num(formData, 'postiDisponibili') ?? 10
  const durata = num(formData, 'durataMinuti') ?? 60
  const quota = num(formData, 'quota')
  const note = str(formData, 'note')

  if (!Number.isInteger(durata) || durata < 10 || durata > 300) return { error: 'Durata non valida (10-300 minuti).' }
  const durataFinestra = Math.max(15, Math.round(num(formData, 'durataFinestraMinuti') ?? 120))
  if (!data || !luogo || !apertura || !chiusura) return { error: 'Compila data e ora della partita, campo e inizio delle convocazioni.' }
  if (apertura >= data) return { error: 'Le convocazioni devono aprirsi prima della partita.' }
  if (chiusura <= apertura) return { error: 'La chiusura delle convocazioni deve essere dopo l’apertura.' }
  if (chiusura > data) return { error: 'Le convocazioni devono chiudersi prima della partita.' }
  if (!Number.isInteger(posti) || posti < 2) return { error: 'Servono almeno 2 posti.' }
  // Oltre il limite si va solo aggiungendo persone dalla lista d'attesa: in modifica
  // si può lasciare il numero raggiunto così, ma non aumentarlo ancora.
  const attuale = matchId
    ? await sanity.fetch<{ posti?: number; stato?: Stato } | null>(`*[_type == "match" && _id == $id][0]{"posti": postiDisponibili, stato}`, {
        id: matchId,
      })
    : null
  const postiAttuali = attuale?.posti ?? 0
  // In base alle convocazioni: aperte fino al massimo; a convocazioni chiuse il numero è già deciso.
  if (automatici) posti = attuale?.stato === 'chiusa' ? postiAttuali : MAX_ISCRITTI
  if (!automatici && posti > Math.max(MAX_GIOCATORI, postiAttuali)) {
    return { error: `Massimo ${MAX_GIOCATORI} giocatori: per andare oltre aggiungi le persone dalla lista d\u2019attesa.` }
  }

  // Partita ricorrente: si salva il modello e le partite vengono generate da lì.
  if (!matchId && formData.get('ripeti') === 'on') {
    const [giorno, ora] = str(formData, 'data').split('T')
    const [apGiorno, apOra] = str(formData, 'aperturaConvocazioni').split('T')
    const [chGiorno, chOra] = str(formData, 'chiusuraConvocazioni').split('T')
    const fineData = str(formData, 'fineData')
    if (fineData && fineData < giorno) return { error: 'La data di fine deve essere dopo la prima partita.' }
    const serie = await sanity.create({
      _type: 'series',
      lega,
      attiva: true,
      primaData: giorno,
      ora,
      ogniSettimane: num(formData, 'ogniSettimane') === 2 ? 2 : 1,
      ...(fineData && { fineData }),
      durataMinuti: durata,
      luogo,
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
    redirect(`/partite/${occurrenceId(serie._id, giorno)}`)
  }

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
    await sanity
      .patch(id)
      .set({
        ...fields,
        convocazioni: assegnaPosti(current?.convocazioni ?? [], posti),
        ...(quota != null && { quota }),
        ...(note && { note }),
      })
      .unset([...(quota == null ? ['quota'] : []), ...(note ? [] : ['note'])])
      .commit()
  } else {
    const doc = await sanity.create({
      _type: 'match',
      lega,
      ...fields,
      ...(quota != null && { quota }),
      ...(note && { note }),
      stato: 'aperta',
      convocazioni: [],
    })
    id = doc._id
  }
  redirect(`/partite/${id}`)
}

const STATI: Stato[] = ['aperta', 'chiusa', 'giocata', 'annullata']

export async function cambiaStato(matchId: string, stato: Stato) {
  await requireForDoc(matchId, 'organizzatore')
  if (!STATI.includes(stato)) throw new Error('Stato non valido')
  const doc = await sanity.fetch<{ stato?: Stato; postiAutomatici?: boolean; convocazioni?: (RawConvocazione & { aggiunto?: boolean })[] } | null>(
    `*[_type == "match" && _id == $id][0]{stato, postiAutomatici, convocazioni}`,
    { id: matchId },
  )
  const patch = sanity.patch(matchId).set({ stato })

  // "In base alle convocazioni": chiudendo si gioca in numero pari (l'ultimo arrivato, se dispari,
  // va in lista d'attesa); riaprendo si torna al massimo.
  if (doc?.postiAutomatici && doc.convocazioni) {
    const iscritti = doc.convocazioni.filter((c) => c.risposta !== 'assente').length
    const posti =
      stato === 'chiusa' && doc.stato === 'aperta' && iscritti >= 2
        ? formatoDaIscritti(iscritti).giocano
        : stato === 'aperta' && doc.stato === 'chiusa'
          ? MAX_ISCRITTI
          : null
    if (posti) patch.set({ postiDisponibili: posti, convocazioni: assegnaPosti(doc.convocazioni, posti) })
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
  if (!match) return { error: 'Partita non trovata.' }
  if (match.stato !== 'chiusa') return { error: 'Le formazioni si fanno dopo aver chiuso le convocazioni.' }

  const inLista = new Set(presenti(match).map((c) => c.giocatore._id))
  const scelti = [...a, ...b]
  if (new Set(scelti).size !== scelti.length) return { error: 'Un giocatore è in tutte e due le squadre.' }
  if (scelti.some((id) => !inLista.has(id))) return { error: 'C\u2019è un giocatore che non è in lista.' }
  if (scelti.length !== inLista.size) return { error: 'Assegna tutti i giocatori in lista a una squadra.' }
  if (!a.length || !b.length) return { error: 'Servono due squadre.' }

  const pettorine = opzioni.pettorine === 'A' || opzioni.pettorine === 'B' ? opzioni.pettorine : null
  const patch = sanity.patch(matchId).set({ squadraA: a.map(ref), squadraB: b.map(ref) })
  if (pettorine) patch.set({ pettorine })
  else patch.unset(['pettorine'])
  if (opzioni.avvisa) patch.set({ formazioniUfficialiIl: new Date().toISOString() })
  await patch.commit()

  // Formazioni ufficiali: ognuno riceve la sua squadra, e chi porta le pettorine il promemoria.
  if (opzioni.avvisa) {
    const titolo = match.formazioniUfficialiIl ? `⚽ ${lega.nome}: formazioni aggiornate` : `⚽ ${lega.nome}: formazioni pronte!`
    const quando = `${formatData(match.data, { weekday: 'long', hour: '2-digit', minute: '2-digit' })} · ${match.luogo}`
    // Chi non ha ancora pagato la quota riceve anche l'invito a pagare con Satispay.
    const pagato = new Set(match.pagamenti.map((p) => p.giocatoreId))
    const invii = (['A', 'B'] as const).flatMap((squadra) => {
      const ids = squadra === 'A' ? a : b
      const base = `Sei nella Squadra ${squadra}${pettorine === squadra ? ': porta la pettorina! 🦺' : '.'}\n${quando}`
      const paga = match.quota != null ? `\n💶 Entra nell'app per pagare ${match.quota} € con Satispay` : ''
      return [
        [ids.filter((id) => pagato.has(id)), base],
        [ids.filter((id) => !pagato.has(id)), base + paga],
      ] as const
    })
    await Promise.all(
      invii.map(([ids, body]) =>
        inviaAGiocatori([...ids], { title: titolo, body, url: `/partite/${matchId}`, tag: `formazioni-${matchId}` }, 'formazioni'),
      ),
    )
  }
  redirect(`/partite/${matchId}`)
}

// Risultato, marcatori e MVP: dopo la fine della partita, per organizzatori e refertatori.
// Il punteggio di ogni squadra è la somma dei gol dei suoi giocatori più autogol/altri.
export async function salvaRisultato(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireForDoc(matchId, 'refertatore')
  const match = await getMatch(matchId)
  if (!match) return { error: 'Partita non trovata.' }
  if (match.stato === 'annullata') return { error: 'La partita è annullata.' }
  if (new Date() < risultatoDa(match)) return { error: 'La partita non è ancora finita.' }
  if (!match.squadraA.length || !match.squadraB.length) return { error: 'Prima vanno fatte le squadre.' }

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
  if (mvp && !inCampo.has(mvp)) return { error: 'L\u2019MVP deve essere uno dei giocatori in campo.' }

  const patch = sanity.patch(matchId).set({
    risultato: { golA, golB },
    autogolA,
    autogolB,
    marcatori: marcatori.map((m) => ({ _key: m.id, _type: 'marcatore', giocatore: { _type: 'reference', _ref: m.id }, gol: m.gol })),
    stato: 'giocata',
  })
  if (mvp) patch.set({ mvp: { _type: 'reference', _ref: mvp } })
  else patch.unset(['mvp'])
  await patch.commit()
  redirect(`/partite/${matchId}`)
}

// ---------- Partite ricorrenti (organizzatori) ----------

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/

export async function salvaSerie(seriesId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireForDoc(seriesId, 'organizzatore')
  const current = await getSeries(seriesId)
  if (!current) return { error: 'Serie non trovata.' }

  const ora = str(formData, 'ora')
  const aperturaOra = str(formData, 'aperturaOra')
  const aperturaGiorniPrima = num(formData, 'aperturaGiorniPrima') ?? 0
  const durataFinestra = Math.max(15, Math.round(num(formData, 'durataFinestraMinuti') ?? 120))
  const luogo = str(formData, 'luogo')
  const posti = num(formData, 'postiDisponibili') ?? 10
  const quota = num(formData, 'quota')
  const note = str(formData, 'note')
  const fineData = str(formData, 'fineData')

  if (!luogo || ![ora, aperturaOra].every((o) => ORA.test(o))) return { error: 'Controlla luogo e orari.' }
  const automatici = formData.get('postiAutomatici') === 'on'
  if (!automatici && (!Number.isInteger(posti) || posti < 2 || posti > MAX_GIOCATORI)) return { error: `Da 2 a ${MAX_GIOCATORI} giocatori.` }
  // Confronto in minuti rispetto all'inizio della partita.
  const minutiPrima = (giorni: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const [ph, pm] = ora.split(':').map(Number)
    return giorni * 1440 + (ph * 60 + pm) - (h * 60 + m)
  }
  const aperturaMinutiPrima = minutiPrima(aperturaGiorniPrima, aperturaOra)
  if (aperturaMinutiPrima <= 0) return { error: 'Le convocazioni devono aprirsi prima della partita.' }
  // Chiusura = apertura + durata, al massimo all'inizio della partita; in "giorni prima" e "ora".
  const chiusuraMinuti = (() => {
    const [ph, pm] = ora.split(':').map(Number)
    return ph * 60 + pm - Math.max(0, aperturaMinutiPrima - durataFinestra) // minuti dalla mezzanotte del giorno partita
  })()
  const chiusuraGiorniPrima = -Math.floor(chiusuraMinuti / 1440)
  const minutoDelGiorno = chiusuraMinuti + chiusuraGiorniPrima * 1440
  const chiusuraOra = `${String(Math.floor(minutoDelGiorno / 60)).padStart(2, '0')}:${String(minutoDelGiorno % 60).padStart(2, '0')}`

  const durata = num(formData, 'durataMinuti') ?? 60
  if (!Number.isInteger(durata) || durata < 10 || durata > 300) return { error: 'Durata non valida (10-300 minuti).' }

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
  const optional = { quota, note: note || undefined, fineData: fineData || undefined }
  await sanity
    .patch(seriesId)
    .set({ ...fields, ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)) })
    .unset(Object.entries(optional).filter(([, v]) => v === undefined).map(([k]) => k))
    .commit()

  await rimuoviFutureVuote(seriesId)
  if (current.attiva !== false) await assicuraRicorrenze({ serie: { ...current, ...fields, ...optional } })
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
  if (!foto.type.startsWith('image/')) return { error: 'La foto deve essere un\u2019immagine.' }
  if (foto.size > MAX_FOTO) return { error: 'La foto è troppo grande (max 4 MB).' }
  const asset = await sanity.assets.upload('image', Buffer.from(await foto.arrayBuffer()), {
    filename: foto.name,
    contentType: foto.type,
  })
  return { foto: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } }
}

const badgeFromForm = (formData: FormData) => {
  const b = str(formData, 'badge')
  return b in BADGE ? b : undefined
}

const caratteristicheFromForm = (formData: FormData) =>
  Object.fromEntries(
    (Object.keys(SKILLS) as Skill[]).map((k) => [k, Math.min(10, Math.max(1, Math.round(num(formData, k) ?? 5)))]),
  )

// Cambio rapido della foto cliccando sull'avatar.
export async function caricaFoto(playerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireForDoc(playerId, 'organizzatore')
  const upload = await uploadFoto(formData.get('foto'))
  if (!upload) return { error: 'Nessuna foto selezionata.' }
  if ('error' in upload) return upload
  await sanity.patch(playerId).set({ foto: upload.foto }).commit()
  refresh()
}

export async function salvaGiocatore(playerId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  // Nuovo giocatore: nella lega attiva. Modifica: nella lega del giocatore.
  const admin = playerId ? await requireForDoc(playerId, 'organizzatore') : await requireAdmin()

  const nome = str(formData, 'nome')
  const email = str(formData, 'email').toLowerCase()
  const telefono = normalizzaTelefono(str(formData, 'telefono'))
  if (!nome) return { error: 'Il nome è obbligatorio.' }
  if (!email && !telefono) return { error: 'Serve l\u2019email o il numero di telefono, per collegarlo quando fa l\u2019accesso.' }
  if (telefono && !/^\+\d{8,15}$/.test(telefono)) return { error: 'Numero di telefono non valido (es. 333 1234567 o +39 333 1234567).' }

  const duplicate = await sanity.fetch<string | null>(
    `*[_type == "player" && lega._ref == $lega && _id != $id && ((defined(email) && lower(email) == $email) || (defined(telefono) && telefono == $telefono))][0].nome`,
    { email: email || '-', telefono: telefono || '-', id: playerId ?? '', lega: admin.lega._id },
  )
  if (duplicate) return { error: `Email o telefono già usati da ${duplicate}.` }

  const upload = await uploadFoto(formData.get('foto'))
  if (upload && 'error' in upload) return upload
  const fotoField = upload?.foto

  const ruolo = str(formData, 'ruolo')
  const piede = str(formData, 'piede')
  const optional = {
    email: email || undefined,
    telefono: telefono || undefined,
    cognome: str(formData, 'cognome') || undefined,
    soprannome: str(formData, 'soprannome') || undefined,
    ruolo: (RUOLI as readonly string[]).includes(ruolo) ? ruolo : undefined,
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
    await sanity.patch(id).set(fields).unset(toUnset).commit()
  } else {
    id = (await sanity.create({ _type: 'player', lega: { _type: 'reference', _ref: admin.lega._id }, ...fields }))._id
  }
  redirect(`/giocatori/${id}`)
}

// ---------- Notifiche ----------

export async function attivaNotifiche(sub: PushSub, dispositivo: string) {
  const utente = await getUtente()
  if (!utente) throw new Error('Accesso richiesto')
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error('Iscrizione non valida')
  await salvaIscrizione(utente.id, sub, dispositivo)
}

// App iPhone/Android: salva il token Firebase del telefono (anche quando Firebase lo rinnova).
export async function attivaNotificheNative(token: string, tipo: 'ios' | 'android', dispositivo: string) {
  const utente = await getUtente()
  if (!utente) return
  if (!token || token.length > 4096 || (tipo !== 'ios' && tipo !== 'android')) throw new Error('Token non valido')
  await salvaTokenNativo(utente.id, token, tipo, dispositivo)
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
  if (!match) return { error: 'Partita non trovata.' }
  const stato = finestra(match)
  if (stato === 'chiusa' || stato === 'scaduta') return { error: 'Le convocazioni sono chiuse: modifica l\u2019orario di chiusura.' }

  const now = new Date().toISOString()
  // Aprendo prima dell'orario previsto, la finestra parte adesso e dura quanto impostato.
  const fine = new Date(Math.min(Date.now() + (match.durataFinestraMinuti ?? 120) * 60_000, new Date(match.data).getTime())).toISOString()
  await sanity
    .patch(matchId)
    .set({ notificaInviataIl: now, ...(stato === 'non_ancora' && { aperturaConvocazioni: now, chiusuraConvocazioni: fine }) })
    .commit()

  const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const
  const risultato = await inviaATutti(
    match.legaId,
    {
      title: `⚽ ${lega.nome}: convocazioni aperte!`,
      body: `${formatData(match.data, breve)} · ${match.luogo}\n${match.postiDisponibili} posti, rispondi entro ${formatData(match.chiusuraConvocazioni, breve)}`,
      url: `/partite/${matchId}`,
      tag: matchId,
    },
    'convocazioni',
  )
  refresh()
  return risultato
}

// ---------- Leghe ----------

// Codici facili da dettare: niente 0/O, 1/I.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function nuovoCodice() {
  for (;;) {
    const codice = Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
    const esiste = await sanity.fetch<number>(`count(*[_type == "league" && codiceInvito == $codice])`, { codice })
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
    ...(utente.telefoni[0] && { telefono: utente.telefoni[0] }),
    clerkUserId: utente.id,
    isAdmin,
    attivo: true,
    caratteristiche: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 5])),
  })
}

export async function creaLega(_prev: FormState, formData: FormData): Promise<FormState> {
  const utente = await getUtente()
  if (!utente) return { error: 'Accesso richiesto.' }
  const nome = str(formData, 'nome')
  if (nome.length < 2 || nome.length > 40) return { error: 'Il nome deve avere tra 2 e 40 caratteri.' }

  const lega = await sanity.create({ _type: 'league', nome, codiceInvito: await nuovoCodice(), creataDa: utente.id })
  await nuovaScheda(lega._id, utente, true)
  await attivaLega(lega._id)
  redirect('/')
}

// Entrare con il link d'invito: chi ce l'ha entra subito nella rosa.
export async function uniscitiConInvito(codice: string) {
  const utente = await getUtente()
  if (!utente) redirect('/sign-in')
  const lega = await sanity.fetch<{ _id: string } | null>(`*[_type == "league" && codiceInvito == $codice][0]{_id}`, {
    codice: codice.toUpperCase(),
  })
  if (!lega) throw new Error('Invito non valido o scaduto')

  if (!(await membroDi(lega._id))) {
    // Chi era stato tolto dalla rosa e riceve di nuovo l'invito, rientra con la sua scheda.
    const vecchia = await sanity.fetch<string | null>(
      `*[_type == "player" && lega._ref == $lega && clerkUserId == $id][0]._id`,
      { lega: lega._id, id: utente.id },
    )
    if (vecchia) await sanity.patch(vecchia).set({ attivo: true }).commit()
    else await nuovaScheda(lega._id, utente, false)
  }
  await attivaLega(lega._id)
  redirect('/')
}

export async function uniscitiConCodice(_prev: FormState, formData: FormData): Promise<FormState> {
  const codice = str(formData, 'codice').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const esiste = await sanity.fetch<number>(`count(*[_type == "league" && codiceInvito == $codice])`, { codice })
  if (!esiste) return { error: 'Codice non valido: controlla di averlo scritto bene.' }
  await uniscitiConInvito(codice)
}

// Cambia la lega attiva su questo dispositivo.
export async function scegliLega(legaId: string, vai = '/') {
  if (!(await membroDi(legaId))) throw new Error('Non fai parte di questa lega')
  await attivaLega(legaId)
  redirect(vai.startsWith('/') ? vai : '/')
}

export async function salvaLega(legaId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireIn(legaId, 'organizzatore')
  const nome = str(formData, 'nome')
  if (nome.length < 2 || nome.length > 40) return { error: 'Il nome deve avere tra 2 e 40 caratteri.' }
  const upload = await uploadFoto(formData.get('logo'))
  if (upload && 'error' in upload) return upload
  const patch = sanity.patch(legaId).set({ nome, ...(upload && { logo: upload.foto }) })
  if (!upload && formData.get('rimuoviFoto') === 'on') patch.unset(['logo'])
  await patch.commit()
  refresh()
  return {}
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
      return { error: 'Il link deve iniziare con https://' }
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
  const tx = sanity.transaction().patch(matchId, (p) => p.setIfMissing({ pagamenti: [] }).unset([`pagamenti[_key=="${playerId}"]`]))
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
  const me = await requireForDoc(matchId)
  const match = await partitaConQuota(matchId)
  if (!inLista(match, me._id)) throw new Error('Non sei in lista per questa partita')
  if (match.pagamenti.some((p) => p.giocatoreId === me._id)) return
  await segnaPagamento(matchId, me._id, { stato: 'confermato', metodo: 'satispay' })
}

// Annullare un pagamento segnato per errore: il giocatore il suo, l'organizzatore quello di chiunque.
export async function annullaPagamento(matchId: string, playerId?: string) {
  const me = await requireForDoc(matchId)
  const chi = playerId ?? me._id
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
  return inviaAGiocatori(daSollecitare, {
    title: `💶 ${lega.nome}: quota da pagare`,
    body: `${match.quota} € per la partita di ${formatData(match.data, { weekday: 'long', day: 'numeric', month: 'long' })}. Paga con Satispay dall'app.`,
    url: `/partite/${matchId}`,
    tag: `quota-${matchId}`,
  })
}

// ---------- Preferenze notifiche e comunicazioni ----------

// Il giocatore sceglie quali notifiche ricevere (per la lega attiva).
export async function salvaPreferenzaNotifica(chiave: string, attiva: boolean) {
  const me = await requirePlayer()
  if (!(chiave in CATEGORIE_NOTIFICHE)) throw new Error('Tipo di notifica non valido')
  await sanity.patch(me._id).setIfMissing({ notifiche: {} }).set({ [`notifiche.${chiave}`]: !!attiva }).commit()
}

// Messaggio del capitano (o di un organizzatore) a tutta la squadra, come notifica.
export async function inviaComunicazione(_prev: AvvisoState, formData: FormData): Promise<AvvisoState> {
  const me = await requirePlayer()
  if (!me.isAdmin && me.badge !== 'capitano') return { error: 'Solo il capitano e gli organizzatori possono scrivere alla squadra.' }
  const testo = str(formData, 'testo')
  if (testo.length < 2) return { error: 'Scrivi un messaggio.' }
  if (testo.length > 300) return { error: 'Massimo 300 caratteri.' }
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

  // Dati che mancano alla scheda giusta: si prendono dal doppione.
  const completa = Object.fromEntries(
    (['clerkUserId', 'cognome', 'soprannome', 'foto', 'ruolo', 'piede', 'badge', 'telefono'] as const)
      .filter((k) => !(tieni as Record<string, unknown>)[k] && (togli as Record<string, unknown>)[k])
      .map((k) => [k, (togli as Record<string, unknown>)[k]]),
  )
  if (Object.keys(completa).length) tx.patch(tieniId, (p) => p.set(completa))
  tx.delete(togliId)
  await tx.commit()
  redirect(`/giocatori/${tieniId}`)
}
