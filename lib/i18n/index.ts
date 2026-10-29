// Lingue dell'app. Il testo nel codice è in italiano e fa da chiave: `t('Partite')`.
// Per le altre lingue si cerca nel loro dizionario; se una frase non c'è si usa l'inglese, e se manca anche
// quello resta in italiano.
// Le parti variabili si scrivono tra graffe: `t('Ciao {nome}', { nome })`.
// Se la stessa parola ha significati diversi, dopo `|` si aggiunge il contesto (in italiano non si vede): `t('P|perse')`.
import { en } from './en'
import { es } from './es'
import { de } from './de'
import { fr } from './fr'

export const LINGUE = {
  it: { nome: 'Italiano', bandiera: '🇮🇹', locale: 'it-IT' },
  en: { nome: 'English', bandiera: '🇬🇧', locale: 'en-GB' },
  es: { nome: 'Español', bandiera: '🇪🇸', locale: 'es-ES' },
  de: { nome: 'Deutsch', bandiera: '🇩🇪', locale: 'de-DE' },
  fr: { nome: 'Français', bandiera: '🇫🇷', locale: 'fr-FR' },
} as const

export type Lingua = keyof typeof LINGUE
export { COOKIE_LINGUA } from './cookie'
export const isLingua = (x: unknown): x is Lingua => typeof x === 'string' && x in LINGUE

type Vars = Record<string, string | number>

// Le date sono salvate in UTC e si mostrano sempre in ora italiana.
const TZ = 'Europe/Rome'

export type T = {
  (testo: string, vars?: Vars): string
  /** Singolare o plurale secondo `n` (che si può usare come {n}). */
  n(n: number, uno: string, tanti: string, vars?: Vars): string
  lingua: Lingua
  locale: string
  data(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string
  /** "mercoledì 21 ottobre" / "Wednesday 21 October" */
  giorno(iso: string | Date): string
  /** "21:30" */
  ora(iso: string | Date): string
  numero(n: number, opts?: Intl.NumberFormatOptions): string
}

// Iniziali dei giorni della settimana da lunedì (il 1° gennaio 2024 era lunedì).
export const inizialiGiorni = (locale: string) =>
  Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i)))

const DIZIONARI: Record<Lingua, Record<string, string> | null> = { it: null, en, es, de, fr }

const riempi = (testo: string, vars?: Vars) =>
  vars ? testo.replace(/\{(\w+)\}/g, (tutto, k: string) => (k in vars ? String(vars[k]) : tutto)) : testo

export function creaT(lingua: Lingua): T {
  const diz = DIZIONARI[lingua]
  const locale = LINGUE[lingua].locale
  const riserva = lingua === 'it' ? null : en
  const t = ((testo: string, vars?: Vars) => riempi(diz?.[testo] ?? riserva?.[testo] ?? testo.split('|')[0], vars)) as T
  t.n = (n, uno, tanti, vars) => t(n === 1 ? uno : tanti, { n, ...vars })
  t.lingua = lingua
  t.locale = locale
  t.data = (iso, opts = { dateStyle: 'full', timeStyle: 'short' }) =>
    new Intl.DateTimeFormat(locale, { ...opts, timeZone: TZ }).format(new Date(iso))
  t.giorno = (iso) => t.data(iso, { weekday: 'long', day: 'numeric', month: 'long' })
  t.ora = (iso) => t.data(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  t.numero = (n, opts) => n.toLocaleString(locale, opts)
  return t
}
