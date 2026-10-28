// Forma dei giocatori e proposte di aggiornamento delle caratteristiche (Pro). Senza dipendenze dal server:
// tutto si ricalcola dalle partite giocate, quindi correggere un risultato corregge anche la forma.
//
// Forma (da −1 a +1, ogni partita): prima della partita si sa quale squadra è più forte (forza media);
// chi fa meglio del previsto sale, chi fa peggio scende. Contano anche gol (rispetto a quelli attesi
// dalla sua tecnica) e MVP. Le partite vecchie pesano sempre meno.
//
// Proposte (ogni PARTITE_PER_REVISIONE partite giocate dal giocatore): gol → tecnica, MVP → cervello,
// km → fiato e scatto, gol subiti dalla sua squadra → difesa, risultati rispetto alle attese → un po' tutte.
//
// Difesa: i gol subiti dalla sua squadra rispetto a quelli attesi. Attesi = gol medi di una squadra nella lega,
// più alti se l'attacco avversario (tecnica media) è forte e più bassi se la difesa della sua squadra
// (difesa media) è forte. Subirne meno del previsto alza la difesa; il merito è di tutta la squadra, per
// questo pesa meno dei gol segnati (che sono solo suoi). Da 0,10 a 0,25 per caratteristica
// (sotto 0,10 non si propone niente), a passi di 0,05; l'organizzatore approva o scarta.

import { SKILLS, type Player, type Skill } from './roster'
import { forza } from './teams'

export const PARTITE_PER_REVISIONE = 5
// Quante partite al massimo guarda una proposta (le più recenti dall'ultima revisione).
const FINESTRA = 10
// Differenza reti massima considerata (un 12–2 vale come un 8–2).
const MAX_DIFF = 6
// Gol di differenza attesi per ogni punto di forza media in più.
const GOL_PER_PUNTO = 2
// Quanto si muove la forma a ogni partita, e quanto resta di quella di prima.
const PASSO = 0.15
const MEMORIA = 0.85
// Nelle formazioni la forma vale metà di un punto di forza.
export const PESO_FORMA = 0.5
// Modifica di un voto in una proposta: sotto il minimo non si propone, sopra il massimo si taglia.
export const MODIFICA_MIN = 0.1
export const MODIFICA_MAX = 0.25
// I voti si muovono a passi di 0,05.
export const passoVoto = (x: number) => Math.round(x * 20) / 20

export type PartitaForma = {
  _id: string
  data: string
  squadraA: string[]
  squadraB: string[]
  risultato?: { golA?: number; golB?: number } | null
  marcatori: { giocatoreId: string; gol: number }[]
  mvpId?: string | null
  distanze: { giocatoreId: string; km?: number | null }[]
}

type GiocatoreForma = Pick<Player, '_id' | 'caratteristiche' | 'revisioneIl'>

// Una partita dal punto di vista di un giocatore.
type Presenza = {
  partita: string
  data: string
  sorpresa: number
  gol: number
  mvp: boolean
  km?: number
  inCampo: number
  /** Gol subiti dalla sua squadra, e quelli attesi. */
  subiti: number
  subitiAttesi: number
}

export type Modifica = { da: number; a: number }
export type Proposta = {
  giocatoreId: string
  /** Partite giocate dall'ultima revisione (approvata o scartata). */
  partite: number
  /** Data dell'ultima partita considerata: approvando o scartando, si riparte da qui. */
  fino: string
  modifiche: Partial<Record<Skill, Modifica>>
  /** I numeri da cui nasce la proposta, da mostrare all'organizzatore. */
  perche: {
    golMedi: number
    golAttesi: number
    mvp: number
    kmMedi?: number
    kmAttesi?: number
    risultati: number
    /** Gol subiti a partita dalla sua squadra, e quelli attesi (difesa). Assenti nelle proposte salvate prima. */
    subitiMedi?: number
    subitiAttesi?: number
  }
}

const limita = (x: number, m: number) => Math.max(-m, Math.min(m, x))
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const voto = (g: GiocatoreForma | undefined, k: Skill) => g?.caratteristiche?.[k] ?? 5

export function analisiForma(giocatori: GiocatoreForma[], tutte: PartitaForma[]) {
  const perId = new Map(giocatori.map((g) => [g._id, g]))
  const partite = tutte
    .filter((m) => m.risultato?.golA != null && m.risultato?.golB != null && m.squadraA.length && m.squadraB.length)
    .sort((a, b) => a.data.localeCompare(b.data))

  // medie della lega: gol e km per giocatore a partita, tecnica e fiato
  const presenze = partite.reduce((s, m) => s + m.squadraA.length + m.squadraB.length, 0)
  const golTot = partite.reduce((s, m) => s + m.marcatori.reduce((t, x) => t + x.gol, 0), 0)
  const mediaGol = presenze ? golTot / presenze : 0
  const tuttiKm = partite.flatMap((m) => m.distanze.map((d) => d.km).filter((k): k is number => !!k && k > 0))
  const mediaKm = media(tuttiKm)
  const mediaTecnica = media(giocatori.map((g) => voto(g, 'tecnica'))) || 5
  const mediaFiato = media(giocatori.map((g) => voto(g, 'fiato'))) || 5
  const mediaDifesa = media(giocatori.map((g) => voto(g, 'difesa'))) || 5
  // gol fatti da una squadra in una partita, in media
  const mediaGolSquadra = partite.length ? partite.reduce((s, m) => s + m.risultato!.golA! + m.risultato!.golB!, 0) / (2 * partite.length) : 0
  // gol che una squadra dovrebbe subire contro quell'attacco, con la sua difesa
  const subitiAttesi = (mia: string[], avversari: string[]) => {
    const attacco = media(avversari.map((id) => voto(perId.get(id), 'tecnica'))) || mediaTecnica
    const difesa = media(mia.map((id) => voto(perId.get(id), 'difesa'))) || mediaDifesa
    return mediaGolSquadra * (attacco / mediaTecnica) * (mediaDifesa / difesa)
  }

  const forma = new Map<string, number>()
  const storia = new Map<string, Presenza[]>()
  const forzaCon = (id: string) => forza(perId.get(id) ?? { _id: id }) + PESO_FORMA * (forma.get(id) ?? 0)

  for (const m of partite) {
    const fa = media(m.squadraA.map(forzaCon))
    const fb = media(m.squadraB.map(forzaCon))
    const attesa = limita((fa - fb) * GOL_PER_PUNTO, MAX_DIFF)
    const reale = limita(m.risultato!.golA! - m.risultato!.golB!, MAX_DIFF)
    // sorpresa per la squadra A: +1 = molto meglio del previsto
    const sorpresa = limita((reale - attesa) / MAX_DIFF, 1)
    const inCampo = m.squadraA.length + m.squadraB.length
    const attesiA = subitiAttesi(m.squadraA, m.squadraB)
    const attesiB = subitiAttesi(m.squadraB, m.squadraA)
    const aggiorna = (id: string, segno: 1 | -1) => {
      const gol = m.marcatori.find((x) => x.giocatoreId === id)?.gol ?? 0
      const golAttesi = mediaGol * (voto(perId.get(id), 'tecnica') / mediaTecnica)
      const mvp = m.mvpId === id
      const singolo = limita(0.3 * (gol - golAttesi), 0.5) + (mvp ? 0.3 : 0)
      const obiettivo = limita(segno * sorpresa + singolo, 1)
      forma.set(id, limita(MEMORIA * (forma.get(id) ?? 0) + PASSO * obiettivo, 1))
      const km = m.distanze.find((d) => d.giocatoreId === id)?.km ?? undefined
      const subiti = segno === 1 ? m.risultato!.golB! : m.risultato!.golA!
      const attesi = segno === 1 ? attesiA : attesiB
      storia.set(id, [
        ...(storia.get(id) ?? []),
        { partita: m._id, data: m.data, sorpresa: segno * sorpresa, gol, mvp, km: km || undefined, inCampo, subiti, subitiAttesi: attesi },
      ])
    }
    m.squadraA.forEach((id) => aggiorna(id, 1))
    m.squadraB.forEach((id) => aggiorna(id, -1))
  }

  const proposte: Proposta[] = []
  for (const g of giocatori) {
    const dopo = (storia.get(g._id) ?? []).filter((p) => !g.revisioneIl || p.data > g.revisioneIl)
    if (dopo.length < PARTITE_PER_REVISIONE) continue
    const finestra = dopo.slice(-FINESTRA)
    const risultati = media(finestra.map((p) => p.sorpresa))
    const golMedi = media(finestra.map((p) => p.gol))
    const golAttesi = mediaGol * (voto(g, 'tecnica') / mediaTecnica)
    const mvp = finestra.filter((p) => p.mvp).length
    // MVP attesi: uno a partita tra tutti quelli in campo
    const mvpAttesi = media(finestra.map((p) => 1 / p.inCampo))
    const conKm = finestra.filter((p) => p.km)
    const kmMedi = conKm.length >= 3 && mediaKm ? media(conKm.map((p) => p.km!)) : undefined
    const kmAttesi = kmMedi != null ? mediaKm * (voto(g, 'fiato') / mediaFiato) : undefined

    const spinta = Object.fromEntries((Object.keys(SKILLS) as Skill[]).map((k) => [k, 0.3 * risultati])) as Record<Skill, number>
    spinta.tecnica += (0.4 * (golMedi - golAttesi)) / Math.max(mediaGol, 0.3)
    spinta.cervello += 2 * (mvp / finestra.length - mvpAttesi)
    if (kmMedi != null && kmAttesi) {
      const rk = (kmMedi - kmAttesi) / kmAttesi
      spinta.fiato += 2 * rk
      spinta.scatto += rk
    }
    // difesa: gol subiti in meno (o in più) del previsto, in proporzione ai gol di una partita (scarti oltre 2 gol non contano di più)
    const subitiMedi = media(finestra.map((p) => p.subiti))
    const subitiPrevisti = media(finestra.map((p) => p.subitiAttesi))
    spinta.difesa += (0.3 * limita(subitiPrevisti - subitiMedi, 2)) / Math.max(mediaGolSquadra, 1)

    const modifiche: Proposta['modifiche'] = {}
    for (const k of Object.keys(SKILLS) as Skill[]) {
      const da = voto(g, k)
      const d = limita(passoVoto(spinta[k]), MODIFICA_MAX)
      if (Math.abs(d) < MODIFICA_MIN) continue
      const a = passoVoto(Math.min(10, Math.max(1, da + d)))
      if (a !== da) modifiche[k] = { da, a }
    }
    if (Object.keys(modifiche).length) {
      proposte.push({
        giocatoreId: g._id,
        partite: dopo.length,
        fino: finestra[finestra.length - 1].data,
        modifiche,
        perche: { golMedi, golAttesi, mvp, kmMedi, kmAttesi, risultati, subitiMedi, subitiAttesi: subitiPrevisti },
      })
    }
  }

  return { forma, proposte, partiteDi: (id: string) => storia.get(id)?.length ?? 0 }
}
