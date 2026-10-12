'use server'

import { randomUUID } from 'node:crypto'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { sanity } from '@/lib/sanity'
import { PIEDI, RUOLI, SKILLS, requireAdmin, requireEditor, requirePlayer, requireRefertatore, type Skill } from '@/lib/player'
import { assegnaPosti, finestra, getMatch, presenti, risultatoDa, type Match, type Risposta, type Stato } from '@/lib/matches'
import { balanceTeams } from '@/lib/teams'
import { MAX_GIOCATORI } from '@/lib/limiti'
import { daysBetween, formatData, isoToRomeLocal, romeLocalToISO } from '@/lib/dates'
import { inviaATutti, rimuoviIscrizione, salvaIscrizione, type PushSub } from '@/lib/push'
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
  const player = await requirePlayer()

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
  await requireAdmin()
  await modificaLista(matchId, key, 'riserva', true, +1)
}

// Annulla l'aggiunta: torna in lista d'attesa e i partecipanti scendono di uno.
export async function rimettiInAttesa(matchId: string, key: string) {
  await requireAdmin()
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
  await requireAdmin()
  const luogo = str(formData, 'luogo')
  const [data, apertura, chiusura] = ['data', 'aperturaConvocazioni', 'chiusuraConvocazioni'].map((k) => {
    const v = str(formData, k)
    return v ? romeLocalToISO(v) : ''
  })
  const posti = num(formData, 'postiDisponibili') ?? 10
  const durata = num(formData, 'durataMinuti') ?? 60
  const quota = num(formData, 'quota')
  const note = str(formData, 'note')

  if (!Number.isInteger(durata) || durata < 10 || durata > 300) return { error: 'Durata non valida (10-300 minuti).' }
  if (!data || !luogo || !apertura || !chiusura) return { error: 'Compila data, luogo e finestra delle convocazioni.' }
  if (chiusura <= apertura) return { error: 'La chiusura delle convocazioni deve essere dopo l’apertura.' }
  if (chiusura > data) return { error: 'Le convocazioni devono chiudersi prima della partita.' }
  if (!Number.isInteger(posti) || posti < 2) return { error: 'Servono almeno 2 posti.' }
  // Oltre il limite si va solo aggiungendo persone dalla lista d'attesa: in modifica
  // si può lasciare il numero raggiunto così, ma non aumentarlo ancora.
  const postiAttuali = matchId
    ? ((await sanity.fetch<number | null>(`*[_type == "match" && _id == $id][0].postiDisponibili`, { id: matchId })) ?? 0)
    : 0
  if (posti > Math.max(MAX_GIOCATORI, postiAttuali)) {
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
      attiva: true,
      primaData: giorno,
      ora,
      ogniSettimane: num(formData, 'ogniSettimane') === 2 ? 2 : 1,
      ...(fineData && { fineData }),
      durataMinuti: durata,
      luogo,
      postiDisponibili: posti,
      ...(quota != null && { quota }),
      ...(note && { note }),
      aperturaGiorniPrima: daysBetween(apGiorno, giorno),
      aperturaOra: apOra,
      chiusuraGiorniPrima: daysBetween(chGiorno, giorno),
      chiusuraOra: chOra,
    })
    await assicuraRicorrenze(serie as unknown as Series)
    redirect(`/partite/${occurrenceId(serie._id, giorno)}`)
  }

  const fields = { data, durataMinuti: durata, luogo, aperturaConvocazioni: apertura, chiusuraConvocazioni: chiusura, postiDisponibili: posti }
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
  await requireAdmin()
  if (!STATI.includes(stato)) throw new Error('Stato non valido')
  await sanity.patch(matchId).set({ stato }).commit()
  refresh()
}

export async function generaSquadre(matchId: string) {
  await requireAdmin()
  const match = await getMatch(matchId)
  if (!match) throw new Error('Partita non trovata')
  if (match.stato !== 'chiusa') throw new Error('Chiudi prima le convocazioni')
  const { a, b } = balanceTeams(presenti(match).map((c) => c.giocatore))
  await sanity
    .patch(matchId)
    .set({ squadraA: a.map((p) => ref(p._id)), squadraB: b.map((p) => ref(p._id)) })
    .commit()
  refresh()
}

export async function spostaGiocatore(matchId: string, playerId: string) {
  await requireAdmin()
  const match = await getMatch(matchId)
  if (!match) throw new Error('Partita non trovata')
  const inA = match.squadraA.some((p) => p._id === playerId)
  const a = match.squadraA.filter((p) => p._id !== playerId).map((p) => p._id)
  const b = match.squadraB.filter((p) => p._id !== playerId).map((p) => p._id)
  ;(inA ? b : a).push(playerId)
  await sanity.patch(matchId).set({ squadraA: a.map(ref), squadraB: b.map(ref) }).commit()
  refresh()
}

// Risultato, marcatori e MVP: dopo la fine della partita, per organizzatori e refertatori.
// Il punteggio di ogni squadra è la somma dei gol dei suoi giocatori più autogol/altri.
export async function salvaRisultato(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRefertatore()
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

export async function eliminaPartita(matchId: string) {
  await requireAdmin()
  const match = await sanity.fetch<{ serie?: { _ref: string }; data: string } | null>(
    `*[_type == "match" && _id == $id][0]{serie, data}`,
    { id: matchId },
  )
  const tx = sanity.transaction().delete(matchId)
  // Se fa parte di una serie, quel giorno non va ricreato.
  if (match?.serie) {
    const giorno = isoToRomeLocal(match.data).slice(0, 10)
    tx.patch(match.serie._ref, (p) => p.setIfMissing({ esclusi: [] }).append('esclusi', [giorno]))
  }
  await tx.commit()
  redirect('/')
}

// ---------- Partite ricorrenti (organizzatori) ----------

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/

export async function salvaSerie(seriesId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const current = await getSeries(seriesId)
  if (!current) return { error: 'Serie non trovata.' }

  const ora = str(formData, 'ora')
  const aperturaOra = str(formData, 'aperturaOra')
  const chiusuraOra = str(formData, 'chiusuraOra')
  const aperturaGiorniPrima = num(formData, 'aperturaGiorniPrima') ?? 0
  const chiusuraGiorniPrima = num(formData, 'chiusuraGiorniPrima') ?? 0
  const luogo = str(formData, 'luogo')
  const posti = num(formData, 'postiDisponibili') ?? 10
  const quota = num(formData, 'quota')
  const note = str(formData, 'note')
  const fineData = str(formData, 'fineData')

  if (!luogo || ![ora, aperturaOra, chiusuraOra].every((o) => ORA.test(o))) return { error: 'Controlla luogo e orari.' }
  if (!Number.isInteger(posti) || posti < 2 || posti > MAX_GIOCATORI) return { error: `Da 2 a ${MAX_GIOCATORI} giocatori.` }
  // Confronto in minuti rispetto all'inizio della partita.
  const minutiPrima = (giorni: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const [ph, pm] = ora.split(':').map(Number)
    return giorni * 1440 + (ph * 60 + pm) - (h * 60 + m)
  }
  if (minutiPrima(chiusuraGiorniPrima, chiusuraOra) < 0) return { error: 'Le convocazioni devono chiudersi prima della partita.' }
  if (minutiPrima(aperturaGiorniPrima, aperturaOra) <= minutiPrima(chiusuraGiorniPrima, chiusuraOra)) {
    return { error: 'L\u2019apertura deve venire prima della chiusura.' }
  }

  const durata = num(formData, 'durataMinuti') ?? 60
  if (!Number.isInteger(durata) || durata < 10 || durata > 300) return { error: 'Durata non valida (10-300 minuti).' }

  const fields = {
    ora,
    durataMinuti: durata,
    luogo,
    postiDisponibili: posti,
    ogniSettimane: num(formData, 'ogniSettimane') === 2 ? 2 : 1,
    aperturaGiorniPrima,
    aperturaOra,
    chiusuraGiorniPrima,
    chiusuraOra,
  }
  const optional = { quota, note: note || undefined, fineData: fineData || undefined }
  await sanity
    .patch(seriesId)
    .set({ ...fields, ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)) })
    .unset(Object.entries(optional).filter(([, v]) => v === undefined).map(([k]) => k))
    .commit()

  await rimuoviFutureVuote(seriesId)
  if (current.attiva !== false) await assicuraRicorrenze({ ...current, ...fields, ...optional })
  redirect('/partite/ricorrenti')
}

export async function attivaSerie(seriesId: string, attiva: boolean) {
  await requireAdmin()
  await sanity.patch(seriesId).set({ attiva }).commit()
  if (attiva) {
    const serie = await getSeries(seriesId)
    if (serie) await assicuraRicorrenze(serie)
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

const caratteristicheFromForm = (formData: FormData) =>
  Object.fromEntries(
    (Object.keys(SKILLS) as Skill[]).map((k) => [k, Math.min(10, Math.max(1, Math.round(num(formData, k) ?? 5)))]),
  )

// Cambio rapido della foto cliccando sull'avatar.
export async function caricaFoto(playerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireEditor()
  const upload = await uploadFoto(formData.get('foto'))
  if (!upload) return { error: 'Nessuna foto selezionata.' }
  if ('error' in upload) return upload
  await sanity.patch(playerId).set({ foto: upload.foto }).commit()
  refresh()
}

// Chi ha solo il permesso "modifica giocatori" può cambiare caratteristiche e foto.
export async function salvaValutazione(playerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireEditor()
  const upload = await uploadFoto(formData.get('foto'))
  if (upload && 'error' in upload) return upload
  const patch = sanity.patch(playerId).set({ caratteristiche: caratteristicheFromForm(formData) })
  if (upload) patch.set({ foto: upload.foto })
  else if (formData.get('rimuoviFoto') === 'on') patch.unset(['foto'])
  await patch.commit()
  redirect(`/giocatori/${playerId}`)
}

export async function salvaGiocatore(playerId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin()

  const nome = str(formData, 'nome')
  const email = str(formData, 'email').toLowerCase()
  if (!nome || !email) return { error: 'Nome ed email sono obbligatori.' }

  const duplicate = await sanity.fetch<string | null>(
    `*[_type == "player" && lower(email) == $email && _id != $id][0].nome`,
    { email, id: playerId ?? '' },
  )
  if (duplicate) return { error: `L'email è già usata da ${duplicate}.` }

  const upload = await uploadFoto(formData.get('foto'))
  if (upload && 'error' in upload) return upload
  const fotoField = upload?.foto

  const ruolo = str(formData, 'ruolo')
  const piede = str(formData, 'piede')
  const optional = {
    cognome: str(formData, 'cognome') || undefined,
    soprannome: str(formData, 'soprannome') || undefined,
    ruolo: (RUOLI as readonly string[]).includes(ruolo) ? ruolo : undefined,
    piede: (PIEDI as readonly string[]).includes(piede) ? piede : undefined,
    foto: fotoField,
  }
  const fields = {
    nome,
    email,
    // Un organizzatore non può togliersi da solo i permessi e restare chiuso fuori.
    isAdmin: playerId === admin._id || formData.get('isAdmin') === 'on',
    puoModificareGiocatori: formData.get('puoModificareGiocatori') === 'on',
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
    id = (await sanity.create({ _type: 'player', ...fields }))._id
  }
  redirect(`/giocatori/${id}`)
}

// ---------- Notifiche ----------

export async function attivaNotifiche(sub: PushSub, dispositivo: string) {
  const player = await requirePlayer()
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error('Iscrizione non valida')
  await salvaIscrizione(player._id, sub, dispositivo)
}

export async function disattivaNotifiche(endpoint: string) {
  const player = await requirePlayer()
  await rimuoviIscrizione(player._id, endpoint)
}

export type AvvisoState = { inviate?: number; totali?: number; error?: string } | undefined

// Apre subito le convocazioni (se non lo sono già per orario) e avvisa tutti.
export async function apriConvocazioni(matchId: string): Promise<AvvisoState> {
  await requireAdmin()
  const match = await getMatch(matchId)
  if (!match) return { error: 'Partita non trovata.' }
  const stato = finestra(match)
  if (stato === 'chiusa' || stato === 'scaduta') return { error: 'Le convocazioni sono chiuse: modifica l\u2019orario di chiusura.' }

  const now = new Date().toISOString()
  await sanity
    .patch(matchId)
    .set({ notificaInviataIl: now, ...(stato === 'non_ancora' && { aperturaConvocazioni: now }) })
    .commit()

  const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const
  const risultato = await inviaATutti({
    title: '⚽ Convocazioni aperte!',
    body: `${formatData(match.data, breve)} · ${match.luogo}\n${match.postiDisponibili} posti, rispondi entro ${formatData(match.chiusuraConvocazioni, breve)}`,
    url: `/partite/${matchId}`,
    tag: matchId,
  })
  refresh()
  return risultato
}
