'use server'

import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sanity } from '@/lib/sanity'
import { getUtente } from '@/lib/player'
import { leggiCampo } from '@/lib/campo'
import { addMinuti, romeLocalToISO, isoToRomeLocal, addDays } from '@/lib/dates'
import { avvisaOrganizzatore } from '@/lib/centro-app'
import { DURATE, METODI, MODI_APP, OCCUPANO, TIPI_CAMPO, getMioCentro, minuti, prezzoPer, requireCentro, type CampoCentro, type Metodo, type ModoApp, type TipoCampo } from '@/lib/centro'
import type { FormState } from './actions'
import { COOKIE_MODO, type Modo } from '@/lib/modo'

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const ORA = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/
const GIORNO = /^\d{4}-\d{2}-\d{2}$/

// "Centro sportivo" o "Giocatore / Allenatore": dove si apre l'app (scelto prima dell'accesso, cambiabile).
export async function scegliModo(modo: Modo) {
  ;(await cookies()).set(COOKIE_MODO, modo, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  redirect(modo === 'centro' ? '/centro' : '/')
}

// ---------- Il centro ----------

export async function creaCentro(_prev: FormState, fd: FormData): Promise<FormState> {
  const utente = await getUtente()
  if (!utente) redirect('/sign-in')
  if (await getMioCentro()) redirect('/centro')
  const nome = str(fd, 'nome').slice(0, 60)
  if (!nome) return { error: 'Scrivi il nome del centro.' }
  // i campi a gruppi: quanti, tipo, dentro/fuori e prezzo orario (oppure "li inserisco dopo")
  const campi: CampoCentro[] = []
  if (fd.get('saltaCampi') !== '1') {
    const quanti = fd.getAll('quanti').map(Number)
    const tipi = fd.getAll('tipo').map(Number)
    const coperti = fd.getAll('coperto').map(String)
    const prezzi = fd.getAll('prezzo').map((x) => Number(String(x).replace(',', '.')))
    for (let i = 0; i < quanti.length; i++) {
      const tipo = tipi[i] as TipoCampo
      if (!Number.isInteger(quanti[i]) || quanti[i] < 1 || quanti[i] > 20) return { error: 'Da 1 a 20 campi per gruppo.' }
      if (!TIPI_CAMPO.includes(tipo)) return { error: 'Scegli il tipo di campo.' }
      if (!Number.isFinite(prezzi[i]) || prezzi[i] < 0 || prezzi[i] > 2000) return { error: 'Prezzo orario non valido.' }
      for (let n = 0; n < quanti[i]; n++) {
        campi.push({ _key: randomUUID(), nome: `Campo ${campi.length + 1}`, tipo, prezzoOra: prezzi[i], coperto: coperti[i] === '1' })
      }
    }
    if (campi.length > 30) return { error: 'Massimo 30 campi.' }
  }
  const posto = leggiCampo(fd.get('campo'))
  await sanity.create({
    _type: 'centro',
    nome,
    ...(str(fd, 'luogo') && { indirizzo: str(fd, 'luogo').slice(0, 120) }),
    ...(posto && { posto }),
    apre: '09:00',
    chiude: '24:00',
    gestori: [utente.id],
    campi,
  })
  ;(await cookies()).set(COOKIE_MODO, 'centro', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  redirect('/centro')
}

export async function salvaCentro(_prev: FormState, fd: FormData): Promise<FormState> {
  const centro = await requireCentro()
  const nome = str(fd, 'nome').slice(0, 60)
  const apre = str(fd, 'apre')
  const chiude = str(fd, 'chiude')
  if (!nome) return { error: 'Scrivi il nome del centro.' }
  if (!ORA.test(apre) || !ORA.test(chiude) || minuti(chiude) <= minuti(apre)) return { error: 'Controlla gli orari: la chiusura deve essere dopo l’apertura.' }
  const posto = leggiCampo(fd.get('campo'))
  const indirizzo = str(fd, 'luogo').slice(0, 120)
  const telefono = str(fd, 'telefono').slice(0, 30)
  await sanity
    .patch(centro._id)
    .set({ nome, apre, chiude, ...(indirizzo && { indirizzo }), ...(posto && { posto }), ...(telefono && { telefono }) })
    .unset([...(indirizzo ? [] : ['indirizzo']), ...(posto ? [] : ['posto']), ...(telefono ? [] : ['telefono'])])
    .commit()
  revalidatePath('/centro', 'layout')
}

// Aggiunge (chiave vuota) o modifica un campo.
export async function salvaCampo(chiave: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const centro = await requireCentro()
  const nome = str(fd, 'nome').slice(0, 40)
  const tipo = Number(str(fd, 'tipo')) as TipoCampo
  const prezzoOra = Number(str(fd, 'prezzoOra').replace(',', '.'))
  if (!nome) return { error: 'Scrivi il nome del campo.' }
  if (!TIPI_CAMPO.includes(tipo)) return { error: 'Scegli il tipo di campo.' }
  if (!Number.isFinite(prezzoOra) || prezzoOra < 0 || prezzoOra > 2000) return { error: 'Prezzo orario non valido.' }
  const campo: CampoCentro = { _key: chiave ?? randomUUID(), nome, tipo, prezzoOra, coperto: fd.get('coperto') === '1' }
  const campi = chiave ? centro.campi.map((c) => (c._key === chiave ? { ...c, ...campo } : c)) : [...centro.campi, campo]
  if (campi.filter((c) => c.attivo !== false).length > 30) return { error: 'Massimo 30 campi.' }
  await sanity.patch(centro._id).set({ campi }).commit()
  revalidatePath('/centro', 'layout')
}

// Un campo tolto non si cancella (le sue prenotazioni passate restano nei conti): non compare più nel planning.
export async function togliCampo(chiave: string) {
  const centro = await requireCentro()
  await sanity
    .patch(centro._id)
    .set({ campi: centro.campi.map((c) => (c._key === chiave ? { ...c, attivo: false } : c)) })
    .commit()
  revalidatePath('/centro', 'layout')
}

// ---------- Prenotazioni ----------

// Si accavalla con un'altra prenotazione dello stesso campo?
async function occupato(centroId: string, campo: string, inizio: string, fine: string, tranne?: string) {
  return sanity.fetch<{ cliente: string; inizio: string } | null>(
    `*[_type == "prenotazione" && centro._ref == $centro && campo == $campo && coalesce(stato, "confermata") in ${OCCUPANO}
      && inizio < $fine && fine > $inizio ${tranne ? '&& _id != $tranne' : ''}][0]{cliente, inizio}`,
    { centro: centroId, campo, inizio, fine, ...(tranne && { tranne }) },
  )
}

// Nuova prenotazione (anche ripetuta ogni settimana) o modifica di una esistente.
export async function salvaPrenotazione(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const centro = await requireCentro()
  const campo = centro.campi.find((c) => c._key === str(fd, 'campo') && c.attivo !== false)
  const giorno = str(fd, 'giorno')
  const ora = str(fd, 'ora')
  const durata = Number(str(fd, 'durata'))
  const cliente = str(fd, 'cliente').slice(0, 80)
  const telefono = str(fd, 'telefono').slice(0, 30)
  const nota = str(fd, 'nota').slice(0, 300)
  const prezzoScritto = str(fd, 'prezzo').replace(',', '.')
  const settimane = id ? 1 : Math.min(40, Math.max(1, Number(str(fd, 'settimane')) || 1))
  if (!campo) return { error: 'Scegli il campo.' }
  if (!GIORNO.test(giorno) || !ORA.test(ora)) return { error: 'Scegli giorno e ora.' }
  if (!(DURATE as readonly number[]).includes(durata)) return { error: 'Durata non valida.' }
  if (!cliente) return { error: 'Scrivi chi prenota.' }
  const prezzo = prezzoScritto ? Number(prezzoScritto) : prezzoPer(campo, durata)
  if (!Number.isFinite(prezzo) || prezzo < 0 || prezzo > 5000) return { error: 'Prezzo non valido.' }
  if (minuti(ora) < minuti(centro.apre) || minuti(ora) + durata > minuti(centro.chiude)) {
    return { error: `Il centro è aperto dalle ${centro.apre} alle ${centro.chiude}.` }
  }

  const dati = { campo: campo._key, cliente, prezzo, ...(telefono && { telefono }), ...(nota && { nota }) }
  if (id) {
    const inizio = romeLocalToISO(`${giorno}T${ora}`)
    const fine = romeLocalToISO(addMinuti(`${giorno}T${ora}`, durata))
    const conflitto = await occupato(centro._id, campo._key, inizio, fine, id)
    if (conflitto) return { error: `Il campo è già prenotato da ${conflitto.cliente} alle ${isoToRomeLocal(conflitto.inizio).slice(11)}.` }
    const esiste = await sanity.fetch<{ app: boolean } | null>(`*[_type == "prenotazione" && _id == $id && centro._ref == $centro][0]{"app": defined(match)}`, { id, centro: centro._id })
    if (!esiste) return { error: 'Prenotazione non trovata.' }
    if (esiste.app) return { error: 'È una prenotazione dall’app: per cambiarla, l’organizzatore sposta la partita (oppure annullala).' }
    await sanity
      .patch(id)
      .set({ ...dati, inizio, fine })
      .unset([...(telefono ? [] : ['telefono']), ...(nota ? [] : ['nota'])])
      .commit()
    revalidatePath('/centro', 'layout')
    redirect(`/centro?giorno=${giorno}`)
  }

  // ripetuta: una prenotazione per settimana; quelle con il campo già occupato si saltano (e si dice quali)
  const serie = settimane > 1 ? randomUUID() : undefined
  const saltate: string[] = []
  const tx = sanity.transaction()
  let create = 0
  for (let s = 0; s < settimane; s++) {
    const g = addDays(giorno, s * 7)
    const inizio = romeLocalToISO(`${g}T${ora}`)
    const fine = romeLocalToISO(addMinuti(`${g}T${ora}`, durata))
    if (await occupato(centro._id, campo._key, inizio, fine)) {
      saltate.push(g)
      continue
    }
    tx.create({ _type: 'prenotazione', centro: { _type: 'reference', _ref: centro._id }, ...dati, inizio, fine, stato: 'confermata', ...(serie && { serie }) })
    create++
  }
  if (!create) return { error: 'Il campo è già occupato in quell’orario.' }
  await tx.commit()
  revalidatePath('/centro', 'layout')
  redirect(`/centro?giorno=${giorno}${saltate.length ? `&saltate=${saltate.length}` : ''}`)
}

async function miaPrenotazione(id: string) {
  const centro = await requireCentro()
  const p = await sanity.fetch<{ _id: string; inizio: string; serie?: string; stato?: string; matchId?: string; organizzatoreId?: string } | null>(
    `*[_type == "prenotazione" && _id == $id && centro._ref == $centro][0]{_id, inizio, serie, stato, "matchId": match._ref, "organizzatoreId": organizzatore._ref}`,
    { id, centro: centro._id },
  )
  if (!p) throw new Error('Prenotazione non trovata')
  return { centro, p }
}

// Annulla una prenotazione o, per quelle ripetute, anche tutte le successive della serie.
export async function annullaPrenotazione(id: string, tutteLeSuccessive = false) {
  const { centro, p } = await miaPrenotazione(id)
  const ids =
    tutteLeSuccessive && p.serie
      ? await sanity.fetch<string[]>(`*[_type == "prenotazione" && centro._ref == $centro && serie == $serie && inizio >= $da && !defined(pagato)]._id`, {
          centro: centro._id,
          serie: p.serie,
          da: p.inizio,
        })
      : [id]
  const tx = sanity.transaction()
  for (const x of ids) tx.patch(x, (q) => q.set({ stato: 'annullata' }))
  await tx.commit()
  // prenotata dall'app: l'organizzatore della partita lo sa
  if (p.organizzatoreId) await avvisaOrganizzatore(p, centro.nome, 'annullata', quandoBreve(p.inizio))
  revalidatePath('/centro', 'layout')
  redirect(`/centro?giorno=${isoToRomeLocal(p.inizio).slice(0, 10)}`)
}

const quandoBreve = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso))

// Una richiesta arrivata dall'app: il centro la conferma o la rifiuta (il campo torna libero).
export async function rispondiRichiesta(id: string, conferma: boolean) {
  const { centro, p } = await miaPrenotazione(id)
  if (p.stato !== 'richiesta') return
  await sanity.patch(id).set({ stato: conferma ? 'confermata' : 'rifiutata' }).commit()
  await avvisaOrganizzatore(p, centro.nome, conferma ? 'confermata' : 'rifiutata', quandoBreve(p.inizio))
  revalidatePath('/centro', 'layout')
}

// Prenotazioni dall'app dei giocatori: confermate subito, da approvare o spente.
export async function salvaModoApp(modo: ModoApp) {
  const centro = await requireCentro()
  if (!MODI_APP.includes(modo)) throw new Error('Scelta non valida')
  await sanity.patch(centro._id).set({ prenotazioniApp: modo }).commit()
  revalidatePath('/centro', 'layout')
}

export async function segnaPagato(id: string, metodo: Metodo) {
  if (!METODI.includes(metodo)) throw new Error('Metodo non valido')
  await miaPrenotazione(id)
  await sanity.patch(id).set({ pagato: { metodo, il: new Date().toISOString() } }).commit()
  revalidatePath('/centro', 'layout')
}

export async function togliPagamento(id: string) {
  await miaPrenotazione(id)
  await sanity.patch(id).unset(['pagato']).commit()
  revalidatePath('/centro', 'layout')
}

// ---------- Gestori ----------

// Aggiunge un gestore con la sua email (deve aver già fatto l'accesso a The Cap almeno una volta).
export async function aggiungiGestore(_prev: FormState, fd: FormData): Promise<FormState> {
  const centro = await requireCentro()
  const email = str(fd, 'email').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Email non valida.' }
  const { clerkClient } = await import('@clerk/nextjs/server')
  const trovati = await (await clerkClient()).users.getUserList({ emailAddress: [email], limit: 1 })
  const id = trovati.data[0]?.id
  if (!id) return { error: 'Nessun account con questa email: chiedigli di accedere a The Cap almeno una volta.' }
  if (!centro.gestori.includes(id)) await sanity.patch(centro._id).set({ gestori: [...centro.gestori, id] }).commit()
  revalidatePath('/centro', 'layout')
}
