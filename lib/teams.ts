import { SKILLS, type Player, type Skill } from './roster'

// Pesi per le formazioni: cervello, scatto, fiato e tecnica contano di più.
export const PESI: Record<Skill, number> = {
  cervello: 1.5,
  scatto: 1.5,
  fiato: 1.5,
  tecnica: 1.5,
  velocita: 0.5,
  reazione: 0.5,
}
export const CHIAVE: Skill[] = ['cervello', 'scatto', 'fiato', 'tecnica']

type Giocatore = Pick<Player, '_id' | 'ruolo' | 'caratteristiche'>

const voto = (p: Giocatore, k: Skill) => p.caratteristiche?.[k] ?? 5

// Forza del giocatore per le formazioni: media pesata delle caratteristiche.
export function forza(p: Giocatore) {
  const tot = (Object.keys(SKILLS) as Skill[]).reduce((s, k) => s + voto(p, k) * PESI[k], 0)
  const pesi = Object.values(PESI).reduce((a, b) => a + b, 0)
  return Math.round((tot / pesi) * 10) / 10
}

const somma = (ps: Giocatore[], f: (p: Giocatore) => number) => ps.reduce((s, p) => s + f(p), 0)

// Quanto sono sbilanciate due squadre: forza totale più, per ognuna delle
// caratteristiche chiave, la differenza tra le due squadre (così non finiscono
// tutti i "cervelli" o tutti i più veloci dalla stessa parte).
export function squilibrio(a: Giocatore[], b: Giocatore[]) {
  const totale = Math.abs(somma(a, forza) - somma(b, forza))
  const chiave = CHIAVE.reduce((s, k) => s + Math.abs(somma(a, (p) => voto(p, k)) - somma(b, (p) => voto(p, k))), 0)
  return totale + 0.25 * chiave
}

// Media di ogni caratteristica per squadra, per il confronto a video.
export function medie(squadra: Giocatore[]) {
  return Object.fromEntries(
    (Object.keys(SKILLS) as Skill[]).map((k) => [k, squadra.length ? somma(squadra, (p) => voto(p, k)) / squadra.length : 0]),
  ) as Record<Skill, number>
}

function migliora<T extends Giocatore>(a: T[], b: T[], bloccati: Set<string>) {
  // Scambi a coppie finché riducono lo squilibrio.
  let costo = squilibrio(a, b)
  for (let migliorato = true; migliorato; ) {
    migliorato = false
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        if (bloccati.has(a[i]._id) || bloccati.has(b[j]._id)) continue
        ;[a[i], b[j]] = [b[j], a[i]]
        const nuovo = squilibrio(a, b)
        if (nuovo < costo - 1e-9) {
          costo = nuovo
          migliorato = true
        } else {
          ;[a[i], b[j]] = [b[j], a[i]]
        }
      }
    }
  }
  return { a, b, costo }
}

// Divide i giocatori in due squadre equilibrate (stesso numero, ±1). Se ci sono
// portieri, i due migliori finiscono in squadre diverse. Tra le divisioni quasi
// ottimali ne sceglie una a caso, così "Automatico" propone formazioni diverse.
export function balanceTeams<T extends Giocatore>(players: T[], tentativi = 300): { a: T[]; b: T[] } {
  const [gk1, gk2] = players.filter((p) => p.ruolo === 'portiere').sort((x, y) => forza(y) - forza(x))
  const bloccati = new Set([gk1, gk2].filter(Boolean).map((p) => p._id))
  const resto = players.filter((p) => !bloccati.has(p._id))

  const risultati: { a: T[]; b: T[]; costo: number }[] = []
  for (let t = 0; t < tentativi; t++) {
    const mescolati = [...resto].sort(() => Math.random() - 0.5)
    const a: T[] = gk1 ? [gk1] : []
    const b: T[] = gk2 ? [gk2] : []
    for (const p of mescolati) (a.length <= b.length ? a : b).push(p)
    risultati.push(migliora(a, b, bloccati))
  }

  const migliore = Math.min(...risultati.map((r) => r.costo))
  const buone = risultati.filter((r) => r.costo <= migliore + 0.5)
  const scelta = buone[Math.floor(Math.random() * buone.length)]
  return { a: scelta.a, b: scelta.b }
}
