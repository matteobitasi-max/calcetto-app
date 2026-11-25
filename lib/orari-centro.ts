// Gli orari del centro sportivo, senza dipendenze dal server (usati anche nelle pagine e nei moduli):
// un orario per ogni giorno della settimana (o "chiuso") e le chiusure straordinarie (festività, ferie).

export type OrarioGiorno = { chiuso?: boolean; apre: string; chiude: string }
export type Chiusura = { _key: string; dal: string; al: string; nome: string }
export const GIORNI_SETTIMANA = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export const minutiDi = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Lunedì = 0 … domenica = 6, per un giorno AAAA-MM-GG.
export const giornoSettimana = (giorno: string) => (new Date(`${giorno}T12:00:00Z`).getUTCDay() + 6) % 7

type ConOrari = { apre: string; chiude: string; orari?: OrarioGiorno[]; chiusure?: Chiusura[] }

// L'orario di un giorno: chiuso per una festività o chiusura, chiuso quel giorno della settimana, o aperto.
export function orarioDel(c: ConOrari, giorno: string): { aperto: boolean; apre: string; chiude: string; motivo?: string } {
  const chiusura = (c.chiusure ?? []).find((x) => giorno >= x.dal && giorno <= x.al)
  const o = c.orari?.[giornoSettimana(giorno)]
  const apre = o?.apre ?? c.apre
  const chiude = o?.chiude ?? c.chiude
  if (chiusura) return { aperto: false, apre, chiude, motivo: chiusura.nome }
  if (o?.chiuso) return { aperto: false, apre, chiude, motivo: `${GIORNI_SETTIMANA[giornoSettimana(giorno)]}: giorno di chiusura` }
  return { aperto: true, apre, chiude }
}

// Ore di apertura di un giorno (0 se chiuso).
export const oreAperte = (c: ConOrari, giorno: string) => {
  const o = orarioDel(c, giorno)
  return o.aperto ? Math.max(0, minutiDi(o.chiude) - minutiDi(o.apre)) / 60 : 0
}

// La settimana completa, anche per i centri creati prima (stesso orario tutti i giorni).
export const settimanaCompleta = (c: ConOrari): OrarioGiorno[] =>
  Array.from({ length: 7 }, (_, i) => c.orari?.[i] ?? { apre: c.apre, chiude: c.chiude })

// Le mezz'ore della giornata, per scegliere apertura e chiusura (fino a mezzanotte).
export const MEZZORE = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

// Pasqua (calendario gregoriano, algoritmo di Meeus).
function pasqua(anno: number) {
  const a = anno % 19
  const b = Math.floor(anno / 100)
  const c = anno % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31)
  const giorno = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(anno, mese - 1, giorno))
}

// Le festività nazionali italiane di un anno.
export function festivitaItaliane(anno: number): { data: string; nome: string }[] {
  const g = (m: number, d: number) => `${anno}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const p = pasqua(anno)
  const pasquetta = new Date(p.getTime() + 86_400_000)
  return [
    { data: g(1, 1), nome: 'Capodanno' },
    { data: g(1, 6), nome: 'Epifania' },
    { data: p.toISOString().slice(0, 10), nome: 'Pasqua' },
    { data: pasquetta.toISOString().slice(0, 10), nome: 'Pasquetta' },
    { data: g(4, 25), nome: 'Festa della Liberazione' },
    { data: g(5, 1), nome: 'Festa del Lavoro' },
    { data: g(6, 2), nome: 'Festa della Repubblica' },
    { data: g(8, 15), nome: 'Ferragosto' },
    { data: g(11, 1), nome: 'Ognissanti' },
    { data: g(12, 8), nome: 'Immacolata' },
    { data: g(12, 25), nome: 'Natale' },
    { data: g(12, 26), nome: 'Santo Stefano' },
  ].sort((a, b) => a.data.localeCompare(b.data))
}
