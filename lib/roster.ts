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

export type Lega = { _id: string; nome: string; logo?: SanityImage; codiceInvito?: string; satispayLink?: string; satispayQr?: SanityImage; fotoSorprese: (SanityImage & { _key: string })[]; citta?: { nome: string; lat: number; lon: number }; playlistInterviste?: string }

export type Player = {
  _id: string
  legaId?: string
  nome: string
  cognome?: string
  soprannome?: string
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

export const playerFields = `_id, "legaId": lega._ref, nome, cognome, soprannome, email, telefono, dataNascita, foto, ruolo, piede, badge, notifiche, isAdmin, puoInserireRisultati, attivo, revisioneIl, "rimosso": defined(rimossoIl), "collegato": defined(clerkUserId), caratteristiche, caratteristicheBase,
  "pro": defined(clerkUserId) && count(*[_type == "abbonamento" && clerkUserId == ^.clerkUserId && attivo != false && (!defined(scadenza) || scadenza > now())]) > 0`


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
