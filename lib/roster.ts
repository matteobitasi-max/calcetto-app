// Tipi e calcoli sui giocatori, senza dipendenze server: usabili ovunque.

export const SKILLS = {
  velocita: 'Velocità',
  tecnica: 'Tecnica',
  cervello: 'Cervello',
  scatto: 'Scatto',
  reazione: 'Reazione',
  fiato: 'Fiato',
} as const

export const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  velocita: 'Velocità di corsa sulla distanza',
  tecnica: 'Controllo palla, passaggio, tiro',
  cervello: 'Visione di gioco, posizione, scelte',
  scatto: 'Accelerazione nei primi metri',
  reazione: 'Riflessi e prontezza sulle palle vaganti',
  fiato: 'Resistenza: quanto regge fino alla fine',
}

export type Skill = keyof typeof SKILLS

export const RUOLI = ['portiere', 'difensore', 'centrocampista', 'attaccante', 'jolly'] as const
export const PIEDI = ['destro', 'sinistro', 'ambidestro'] as const

// Il badge che si vede accanto al nome.
export const BADGE = {
  capitano: { label: 'Capitano', emoji: 'Ⓒ' },
  legend: { label: 'Legend', emoji: '🏆' },
  rookie: { label: 'Rookie', emoji: '🐣' },
  asinus: { label: 'Asinus', emoji: '🫏' },
  promessa: { label: 'Promessa', emoji: '🌱' },
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

export type Lega = { _id: string; nome: string; logo?: SanityImage; codiceInvito?: string; satispayLink?: string; satispayQr?: SanityImage }

export type Player = {
  _id: string
  legaId?: string
  nome: string
  cognome?: string
  soprannome?: string
  email?: string
  foto?: SanityImage
  ruolo?: string
  piede?: string
  badge?: Badge
  notifiche?: Partial<Record<CategoriaNotifica, boolean>>
  isAdmin?: boolean
  puoModificareGiocatori?: boolean
  puoInserireRisultati?: boolean
  attivo?: boolean
  caratteristiche?: Partial<Record<Skill, number>>
}

export const playerFields = `_id, "legaId": lega._ref, nome, cognome, soprannome, email, foto, ruolo, piede, badge, notifiche, isAdmin, puoModificareGiocatori, puoInserireRisultati, attivo, caratteristiche`

// Chi può cambiare caratteristiche e foto dei giocatori.
export const canEditPlayers = (p: Pick<Player, 'isAdmin' | 'puoModificareGiocatori'>) => !!(p.isAdmin || p.puoModificareGiocatori)

// Chi può segnare risultato, marcatori e MVP.
export const canEnterResults = (p: Pick<Player, 'isAdmin' | 'puoInserireRisultati'>) => !!(p.isAdmin || p.puoInserireRisultati)

export function displayName(p: Pick<Player, 'nome' | 'cognome' | 'soprannome'>) {
  return p.soprannome || [p.nome, p.cognome].filter(Boolean).join(' ')
}

// Media delle sei caratteristiche, usata per bilanciare le squadre.
export function overall(p: Pick<Player, 'caratteristiche'>) {
  const c = p.caratteristiche ?? {}
  const keys = Object.keys(SKILLS) as Skill[]
  return Math.round((keys.reduce((s, k) => s + (c[k] ?? 5), 0) / keys.length) * 10) / 10
}
