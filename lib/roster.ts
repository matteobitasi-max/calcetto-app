import type { Stagione } from './stagioni'
// Tipi e calcoli sui giocatori, senza dipendenze server: usabili ovunque.

export const SKILLS = {
  velocita: 'Velocità',
  tecnica: 'Tecnica',
  cervello: 'Cervello',
  scatto: 'Scatto',
  reazione: 'Reazione',
  fiato: 'Fiato',
  difesa: 'Difesa',
} as const

export const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  velocita: 'Velocità di corsa sulla distanza',
  tecnica: 'Controllo palla, passaggio, tiro',
  cervello: 'Visione di gioco, posizione, scelte',
  scatto: 'Accelerazione nei primi metri',
  reazione: 'Riflessi e prontezza sulle palle vaganti',
  fiato: 'Resistenza: quanto regge fino alla fine',
  difesa: 'Marcatura, contrasti, chiusure e copertura',
}

export type Skill = keyof typeof SKILLS

export const RUOLI = ['portiere', 'difensore', 'centrocampista', 'attaccante', 'jolly'] as const

// Club PRO: i ruoli precisi di una squadra vera, divisi per reparto, con la sigla. Ognuno appartiene a una
// linea (portiere, difensore, centrocampista, attaccante): così formazioni e squadre li trattano come i ruoli base.
// "Allenatore" è nella rosa ma non gioca: niente caratteristiche, voti, convocazioni né formazioni.
export const REPARTI_CLUB = [
  { reparto: 'Portieri', linea: 'portiere', ruoli: [['portiere', 'POR']] },
  {
    reparto: 'Difensori',
    linea: 'difensore',
    ruoli: [['libero', 'LIB'], ['difensore centrale', 'DC'], ['difensore destro', 'DD'], ['difensore sinistro', 'DS'], ['terzino destro', 'TD'], ['terzino sinistro', 'TS'], ['difensore', 'DIF']],
  },
  {
    reparto: 'Centrocampisti',
    linea: 'centrocampista',
    ruoli: [['mediano', 'MED'], ['regista', 'REG'], ['mezzala', 'MEZ'], ['centrocampista centrale', 'CC'], ['esterno destro', 'ED'], ['esterno sinistro', 'ES'], ['trequartista', 'TRQ'], ['centrocampista', 'CEN']],
  },
  {
    reparto: 'Attaccanti',
    linea: 'attaccante',
    ruoli: [['ala destra', 'AD'], ['ala sinistra', 'AS'], ['seconda punta', 'SP'], ['centravanti', 'CF'], ['attaccante', 'ATT']],
  },
  { reparto: 'Jolly e staff', linea: 'jolly', ruoli: [['jolly', 'JOL'], ['allenatore', 'ALL']] },
] as const

export const ALLENATORE = 'allenatore'
const SIGLE_RUOLI = new Map<string, string>(REPARTI_CLUB.flatMap((r) => r.ruoli.map(([n, s]) => [n, s] as [string, string])))
const LINEE_RUOLI = new Map<string, string>(REPARTI_CLUB.flatMap((r) => r.ruoli.map(([n]) => [n, r.linea] as [string, string])))
export const RUOLI_CLUB = [...SIGLE_RUOLI.keys()]

// I ruoli che si possono scegliere: in una lega Club quelli precisi (e l'allenatore), altrimenti quelli base.
export const ruoliValidi = (club?: boolean): readonly string[] => (club ? RUOLI_CLUB : RUOLI)
/** Un ruolo scritto a mano o da un file (nome o sigla, maiuscole o no) → il ruolo, se esiste. */
export function leggiRuolo(testo: string, club?: boolean): string {
  const x = testo.trim().toLowerCase()
  if (ruoliValidi(club).includes(x)) return x
  if (!club) return ''
  for (const [n, s] of SIGLE_RUOLI) if (s.toLowerCase() === x) return n
  return ''
}
/** La linea del ruolo (portiere, difensore, centrocampista, attaccante, jolly): serve per formazioni e squadre. */
export const lineaDi = (ruolo?: string | null): string | undefined => (ruolo ? (ruolo === ALLENATORE ? undefined : (LINEE_RUOLI.get(ruolo) ?? ruolo)) : undefined)
/** Sigla breve del ruolo (es. DC), per la tabella e il campo. */
export const siglaRuolo = (ruolo?: string | null) => (ruolo ? (SIGLE_RUOLI.get(ruolo) ?? ruolo.slice(0, 3).toUpperCase()) : '')
export const isAllenatore = (p: { ruolo?: string | null }) => p.ruolo === ALLENATORE
export const PIEDI = ['destro', 'sinistro', 'ambidestro'] as const

// Il badge che si vede accanto al nome.
export const BADGE = {
  capitano: { label: 'Capitano', emoji: 'Ⓐ', descrizione: 'Il capitano della squadra: può scrivere a tutti i giocatori della lega.' },
  legend: { label: 'Legend', emoji: '🏆', descrizione: 'Una leggenda del gruppo: lo decide l\u2019organizzatore.' },
  rookie: { label: 'Rookie', emoji: '🐣', descrizione: 'Nuovo arrivato: ha appena iniziato a giocare con la lega.' },
  asinus: { label: 'Asinus', emoji: '🫏', descrizione: 'Il premio (poco ambito) per chi ne ha combinata qualcuna: lo decide l\u2019organizzatore.' },
  promessa: { label: 'Promessa', emoji: '🌱', descrizione: 'Un talento in crescita: lo decide l\u2019organizzatore.' },
} as const
export type Badge = keyof typeof BADGE

// Tipi di notifica che ognuno può spegnere (di default accese).
export const CATEGORIE_NOTIFICHE = {
  convocazioni: { label: 'Convocazioni aperte', emoji: '📣' },
  formazioni: { label: 'Formazioni create', emoji: '⚖️' },
  capitano: { label: 'Comunicazioni del capitano', emoji: '📢' },
} as const
export type CategoriaNotifica = keyof typeof CATEGORIE_NOTIFICHE

export type SanityImage = { asset?: { _ref: string }; hotspot?: unknown; crop?: unknown }

export type Lega = {
  _id: string
  nome: string
  /** Le stagioni chiuse (Impostazioni lega › Termina stagione): periodo e nome. */
  stagioni?: Stagione[]
  /** Club attivo (per ora lo accende il titolare): sblocca il tipo "Squadra". */
  club?: boolean
  /** Squadra con allenatore: convocati scelti dall'allenatore, indisponibili. Senza: lega tra amici. */
  tipo?: 'squadra'
  /** Squadra: i giocatori possono convocarsi da soli (come tra amici). Di base convoca l'allenatore. */
  autoconvocazione?: boolean
  /** Squadra: pagelle a fine partita con note (di base sì; false per spegnerle). */
  pagelle?: boolean
  /** Club: giocatori per squadra (5, 6, 7, 8, 9 o 11, portiere compreso) e modulo preferito (es. 4-4-2). */
  formato?: number
  modulo?: string
} & { logo?: SanityImage; codiceInvito?: string; satispayLink?: string; satispayQr?: SanityImage; fotoSorprese: (SanityImage & { _key: string })[]; citta?: { nome: string; lat: number; lon: number }; playlistInterviste?: string }

export type Player = {
  /** Le stagioni (chiave) di cui ha già aperto il wrap: il pop-up non si ripropone. */
  wrapVisti?: string[]
  _id: string
  /** Revisione del documento: per non sovrascrivere modifiche fatte nel frattempo. */
  _rev?: string
  legaId?: string
  nome: string
  cognome?: string
  soprannome?: string
  /** Numero di maglia (0-99): unico tra i giocatori attivi della lega; serve anche per i dati di Veo. */
  numero?: number
  email?: string
  /** Formato internazionale, es. +393331234567. */
  telefono?: string
  /** AAAA-MM-GG, facoltativa (dal profilo personale). */
  dataNascita?: string
  foto?: SanityImage
  ruolo?: string
  piede?: string
  badge?: Badge
  notifiche?: Partial<Record<CategoriaNotifica, boolean>>
  isAdmin?: boolean
  puoInserireRisultati?: boolean
  attivo?: boolean
  /** Leghe "Squadra": infortunato, squalificato o indisponibile (fino a una data compresa, o finché non si toglie). */
  indisponibile?: Indisponibilita
  /** Ha l'abbonamento Pro (C con la scritta PRO accanto al nome). */
  pro?: boolean
  /** Pro: data dell'ultima partita già valutata per aggiornare le caratteristiche. */
  revisioneIl?: string
  /** Tolto dalla lega da un organizzatore (non compare più nella rosa). */
  rimosso?: boolean
  /** Ha già fatto l'accesso (la scheda è collegata a un account). */
  collegato?: boolean
  caratteristiche?: Partial<Record<Skill, number>>
  /** Pro: i voti messi dall'organizzatore prima delle proposte approvate (per mostrare i miglioramenti). */
  caratteristicheBase?: Partial<Record<Skill, number>>
}

export const playerFields = `_id, _rev, "legaId": lega._ref, nome, cognome, soprannome, numero, email, telefono, dataNascita, foto, ruolo, piede, badge, notifiche, isAdmin, puoInserireRisultati, attivo, indisponibile, revisioneIl, "rimosso": defined(rimossoIl), "collegato": defined(clerkUserId), caratteristiche, caratteristicheBase, wrapVisti,
  "pro": defined(clerkUserId) && count(*[_type == "abbonamento" && clerkUserId == ^.clerkUserId && attivo != false && (!defined(scadenza) || scadenza > now())]) > 0`


export type MotivoIndisponibile = 'infortunio' | 'squalifica' | 'altro'
export type Indisponibilita = { motivo: MotivoIndisponibile; fino?: string; nota?: string }
export const MOTIVI_INDISPONIBILE: Record<MotivoIndisponibile, { emoji: string; label: string }> = {
  infortunio: { emoji: '🚑', label: 'Infortunato' },
  squalifica: { emoji: '🟥', label: 'Squalificato' },
  altro: { emoji: '⛔', label: 'Indisponibile' },
}
// Indisponibile in quel giorno (AAAA-MM-GG, ora italiana): senza data di fine, finché l'allenatore non lo toglie.
export const indisponibileIl = (p: Pick<Player, 'indisponibile'>, giorno: string) => !!p.indisponibile && (!p.indisponibile.fino || p.indisponibile.fino >= giorno)

// Chi può segnare risultato, marcatori e MVP.
export const canEnterResults = (p: Pick<Player, 'isAdmin' | 'puoInserireRisultati'>) => !!(p.isAdmin || p.puoInserireRisultati)

// Negli elenchi il mio nome va sempre in cima (gli altri restano nel loro ordine).
export function mioInCima<T>(lista: T[], mioId: string | undefined, id: (x: T) => string | undefined) {
  if (!mioId) return lista
  return [...lista.filter((x) => id(x) === mioId), ...lista.filter((x) => id(x) !== mioId)]
}

// Anni compiuti da una data di nascita AAAA-MM-GG.
export function eta(dataNascita: string, oggi = new Date()) {
  const [a, m, g] = dataNascita.split('-').map(Number)
  const compiuti = oggi.getMonth() + 1 > m || (oggi.getMonth() + 1 === m && oggi.getDate() >= g)
  return oggi.getFullYear() - a - (compiuti ? 0 : 1)
}

// Numero di telefono in formato internazionale (+39…): così combacia con quello verificato da Clerk.
export function normalizzaTelefono(input: string) {
  const s = input.replace(/[\s.\-()/]/g, '')
  if (!s) return ''
  if (s.startsWith('+')) return s
  if (s.startsWith('00')) return `+${s.slice(2)}`
  if (/^3\d{8,9}$/.test(s)) return `+39${s}` // cellulare italiano senza prefisso
  return s
}

// Iniziali per l'avatar senza foto: solo le lettere (es. "Andrea (prova)" → "AP").
export function iniziali(nome: string) {
  return nome
    .split(/\s+/)
    .map((w) => w.match(/\p{L}/u)?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function displayName(p: Pick<Player, 'nome' | 'cognome' | 'soprannome'>) {
  return p.soprannome || [p.nome, p.cognome].filter(Boolean).join(' ')
}

// Media delle caratteristiche, usata per bilanciare le squadre.
export function overall(p: Pick<Player, 'caratteristiche'>) {
  const c = p.caratteristiche ?? {}
  const keys = Object.keys(SKILLS) as Skill[]
  return Math.round((keys.reduce((s, k) => s + (c[k] ?? 5), 0) / keys.length) * 10) / 10
}
