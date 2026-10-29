// Calendario e classifica di un girone all'italiana (senza dipendenze dal server).

/** Le giornate: per ognuna le coppie [casa, ospite] (indici delle squadre). Con squadre dispari una riposa a turno. */
export function giornate(squadre: number, andataRitorno = false): [number, number][][] {
  const ids = Array.from({ length: squadre }, (_, i) => i)
  if (ids.length % 2) ids.push(-1) // riposo
  const n = ids.length
  const andata: [number, number][][] = []
  let giro = [...ids]
  for (let g = 0; g < n - 1; g++) {
    const coppie: [number, number][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = giro[i]
      const b = giro[n - 1 - i]
      if (a < 0 || b < 0) continue
      // si alterna chi gioca "in casa" (squadra A) per non avere sempre gli stessi
      coppie.push((g + i) % 2 ? [b, a] : [a, b])
    }
    andata.push(coppie)
    // metodo del cerchio: la prima resta ferma, le altre ruotano
    giro = [giro[0], giro[n - 1], ...giro.slice(1, n - 1)]
  }
  return andataRitorno ? [...andata, ...andata.map((g) => g.map(([a, b]) => [b, a] as [number, number]))] : andata
}

export type RigaClassifica = { chiave: string; nome: string; colore?: string; g: number; v: number; n: number; p: number; gf: number; gs: number; punti: number }

/** Classifica: punti, poi differenza reti, poi gol fatti. */
export function classifica(
  squadre: { _key: string; nome: string; colore?: string }[],
  partite: { chiaveA?: string; chiaveB?: string; golA?: number; golB?: number }[],
  puntiVittoria = 3,
  puntiPareggio = 1,
): RigaClassifica[] {
  const righe = new Map(squadre.map((s) => [s._key, { chiave: s._key, nome: s.nome, colore: s.colore, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, punti: 0 }]))
  for (const m of partite) {
    const a = m.chiaveA ? righe.get(m.chiaveA) : undefined
    const b = m.chiaveB ? righe.get(m.chiaveB) : undefined
    if (!a || !b || m.golA == null || m.golB == null) continue
    for (const [r, fatti, subiti] of [
      [a, m.golA, m.golB],
      [b, m.golB, m.golA],
    ] as const) {
      r.g++
      r.gf += fatti
      r.gs += subiti
      if (fatti > subiti) {
        r.v++
        r.punti += puntiVittoria
      } else if (fatti === subiti) {
        r.n++
        r.punti += puntiPareggio
      } else r.p++
    }
  }
  return [...righe.values()].sort((x, y) => y.punti - x.punti || y.gf - y.gs - (x.gf - x.gs) || y.gf - x.gf || x.nome.localeCompare(y.nome))
}

// Nomi e colori proposti per le squadre.
export const SQUADRE_PREDEFINITE = [
  { nome: 'Squadra 1', en: 'Team 1', colore: '#dc2626' },
  { nome: 'Squadra 2', en: 'Team 2', colore: '#2563eb' },
  { nome: 'Squadra 3', en: 'Team 3', colore: '#16a34a' },
  { nome: 'Squadra 4', en: 'Team 4', colore: '#eab308' },
  { nome: 'Squadra 5', en: 'Team 5', colore: '#27272a' },
  { nome: 'Squadra 6', en: 'Team 6', colore: '#a1a1aa' },
  { nome: 'Squadra 7', en: 'Team 7', colore: '#ea580c' },
  { nome: 'Squadra 8', en: 'Team 8', colore: '#9333ea' },
  { nome: 'Squadra 9', en: 'Team 9', colore: '#38bdf8' },
  { nome: 'Squadra 10', en: 'Team 10', colore: '#ec4899' },
  { nome: 'Squadra 11', en: 'Team 11', colore: '#7f1d1d' },
  { nome: 'Squadra 12', en: 'Team 12', colore: '#6b7280' },
  { nome: 'Squadra 13', en: 'Team 13', colore: '#14b8a6' },
  { nome: 'Squadra 14', en: 'Team 14', colore: '#84cc16' },
  { nome: 'Squadra 15', en: 'Team 15', colore: '#92400e' },
  { nome: 'Squadra 16', en: 'Team 16', colore: '#ca8a04' },
]

// Nome proposto per la squadra n. `i`, nella lingua dell'app.
const SQUADRA: Record<string, string> = { it: 'Squadra', en: 'Team', es: 'Equipo', de: 'Team', fr: 'Équipe' }
export const nomePredefinito = (i: number, lingua: string) => (SQUADRE_PREDEFINITE[i] ? `${SQUADRA[lingua] ?? 'Squadra'} ${i + 1}` : '')

// ---------- Gironi + tabellone ----------

export const LETTERE_GIRONI = 'ABCDEFGH'.split('')

/** Distribuzione di base delle squadre nei gironi: a turno (A, B, C, A, B, C, …). */
export const gironiDiBase = (squadre: number, gironi: number) => Array.from({ length: squadre }, (_, i) => i % gironi)

/** Primo turno della fase finale (squadre a due a due): ogni prima contro la seconda del girone dopo
 * (1ª A – 2ª B, 1ª B – 2ª C, …, 1ª ultimo – 2ª A), così non si incontrano subito squadre dello stesso girone.
 * Se passa solo la prima: le prime in ordine di girone (1ª A – 1ª B, 1ª C – 1ª D, …). */
export function incrociGironi(classifiche: string[][], qualificate: number) {
  const prime = classifiche.map((c) => c[0]).filter(Boolean)
  if (qualificate < 2) return prime
  return prime.flatMap((p, i) => [p, classifiche[(i + 1) % classifiche.length][1]].filter(Boolean))
}
