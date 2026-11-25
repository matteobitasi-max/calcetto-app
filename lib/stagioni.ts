// Le stagioni di una lega. Terminare una stagione non cancella niente: si salva il periodo (dal … al) con un
// nome, es. "2025/26", e da quel momento classifica, statistiche e rosa ripartono da zero (stagione in corso).
// Le stagioni chiuse restano consultabili, e "Sempre" mette insieme tutto.
export type Stagione = { _key: string; nome: string; dal?: string; al: string }
export type Periodo = { dal?: string; al?: string }

// L'ultima stagione chiusa per data di fine (le stagioni si aggiungono sempre in coda, ma meglio non fidarsi).
const ordinate = (stagioni?: Stagione[]) => [...(stagioni ?? [])].sort((a, b) => a.al.localeCompare(b.al))

// La stagione in corso: dalla fine dell'ultima chiusa (o dall'inizio, se non ce ne sono).
export const periodoInCorso = (stagioni?: Stagione[]): Periodo => {
  const ultima = ordinate(stagioni).at(-1)
  return ultima ? { dal: ultima.al } : {}
}

// La scelta nella pagina delle statistiche: "in corso" (predefinita), una stagione chiusa, o "tutte".
export function periodoScelto(scelta: unknown, stagioni?: Stagione[]): { chiave: string; periodo: Periodo } {
  if (scelta === 'tutte') return { chiave: 'tutte', periodo: {} }
  const s = (stagioni ?? []).find((x) => x._key === scelta)
  if (s) return { chiave: s._key, periodo: { ...(s.dal && { dal: s.dal }), al: s.al } }
  return { chiave: 'corso', periodo: periodoInCorso(stagioni) }
}

// Il nome proposto per la stagione che si chiude: "2025/26" se va a cavallo di due anni, altrimenti "2026".
export function nomeProposto(inizio: string | undefined, fine: string) {
  const a = new Date(inizio ?? fine).getFullYear()
  const b = new Date(fine).getFullYear()
  return a === b ? String(b) : `${a}/${String(b).slice(-2)}`
}

export const stagioniOrdinate = (stagioni?: Stagione[]) => ordinate(stagioni).reverse()
