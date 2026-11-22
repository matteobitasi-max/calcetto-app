// Formati di gioco e moduli del Club: quanti giocano per squadra (portiere compreso) e come si dispongono.
// Il modulo conta solo i giocatori di movimento, dalla difesa all'attacco (es. 4-4-2 = 4 difensori, 4 centrocampisti, 2 attaccanti).

export const FORMATI = [5, 6, 7, 8, 9, 11] as const
export type Formato = (typeof FORMATI)[number]

export const MODULI: Record<Formato, string[]> = {
  5: ['2-2', '1-2-1', '3-1'],
  6: ['2-2-1', '2-1-2', '3-1-1'],
  7: ['3-2-1', '2-3-1', '3-1-2', '2-2-2'],
  8: ['3-3-1', '3-2-2', '2-3-2', '3-1-3'],
  9: ['3-3-2', '3-4-1', '4-3-1', '3-2-3'],
  11: ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '4-5-1', '4-3-1-2', '5-4-1'],
}

export const isFormato = (n: unknown): n is Formato => FORMATI.includes(n as Formato)
export const moduloValido = (formato: Formato, modulo: string) => MODULI[formato].includes(modulo)
// Il modulo da usare: quello scelto, se va bene per il formato, altrimenti il primo del formato.
export const moduloPer = (formato: Formato, modulo?: string) => (modulo && moduloValido(formato, modulo) ? modulo : MODULI[formato][0])

// Le linee del modulo, dalla difesa all'attacco: [4, 4, 2].
export const linee = (modulo: string) => modulo.split('-').map(Number)

// Il ruolo di ogni linea: la prima è la difesa, l'ultima l'attacco, quelle in mezzo il centrocampo.
export type RuoloPosto = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante'
export const ruoliLinee = (modulo: string): RuoloPosto[] => {
  const l = linee(modulo)
  return l.map((_, i) => (i === 0 ? 'difensore' : i === l.length - 1 ? 'attaccante' : 'centrocampista'))
}

// Tutti i posti in campo in ordine: 0 è il portiere, poi linea per linea da sinistra a destra.
export type Posto = { indice: number; ruolo: RuoloPosto; linea: number; colonna: number; perLinea: number }
export function posti(modulo: string): Posto[] {
  const r = ruoliLinee(modulo)
  const lista: Posto[] = [{ indice: 0, ruolo: 'portiere', linea: -1, colonna: 0, perLinea: 1 }]
  linee(modulo).forEach((n, l) => {
    for (let c = 0; c < n; c++) lista.push({ indice: lista.length, ruolo: r[l], linea: l, colonna: c, perLinea: n })
  })
  return lista
}

// Formazione proposta: in ogni posto chi ha quel ruolo, dal più forte; i posti rimasti ai jolly e poi ai più forti
// tra gli altri. Chi non entra va in panchina. Restituisce l'id per ogni posto (null se mancano giocatori).
export function proponi(modulo: string, giocatori: { id: string; ruolo?: string; forza: number }[]): (string | null)[] {
  const liberi = [...giocatori].sort((a, b) => b.forza - a.forza)
  const prendi = (filtro: (g: (typeof liberi)[number]) => boolean) => {
    const i = liberi.findIndex(filtro)
    return i < 0 ? null : liberi.splice(i, 1)[0].id
  }
  const ps = posti(modulo)
  const scelti: (string | null)[] = ps.map(() => null)
  // prima ognuno nel suo ruolo (il portiere per primo)
  for (const p of ps) scelti[p.indice] = prendi((g) => g.ruolo === p.ruolo)
  // poi i jolly, poi i più forti, nei posti rimasti vuoti (in porta, se manca il portiere, l'ultimo)
  for (const p of ps.slice(1)) if (!scelti[p.indice]) scelti[p.indice] = prendi((g) => g.ruolo === 'jolly') ?? prendi(() => true)
  if (!scelti[0]) scelti[0] = liberi.length ? liberi.splice(liberi.length - 1, 1)[0].id : null
  return scelti
}

// Sigle dei posti, per l'editor.
export const SIGLA: Record<RuoloPosto, string> = { portiere: 'POR', difensore: 'DIF', centrocampista: 'CEN', attaccante: 'ATT' }
