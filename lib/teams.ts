import { overall, type Player } from './roster'

type Split = { a: Player[]; b: Player[]; diff: number }

const sum = (ps: Player[]) => ps.reduce((s, p) => s + overall(p), 0)

function improve(a: Player[], b: Player[], locked: Set<string>): Split {
  // Scambi a coppie finché riducono la differenza di forza tra le squadre.
  let diff = Math.abs(sum(a) - sum(b))
  for (let improved = true; improved; ) {
    improved = false
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        if (locked.has(a[i]._id) || locked.has(b[j]._id)) continue
        const delta = overall(a[i]) - overall(b[j])
        const next = Math.abs(sum(a) - sum(b) - 2 * delta)
        if (next < diff - 1e-9) {
          ;[a[i], b[j]] = [b[j], a[i]]
          diff = next
          improved = true
        }
      }
    }
  }
  return { a, b, diff }
}

// Divide i giocatori in due squadre equilibrate. Se ci sono portieri, i due
// migliori finiscono in squadre diverse; tra le divisioni quasi ottimali ne sceglie
// una a caso, così "rigenera" propone formazioni diverse.
export function balanceTeams(players: Player[], tries = 200): { a: Player[]; b: Player[] } {
  const [gk1, gk2] = players.filter((p) => p.ruolo === 'portiere').sort((x, y) => overall(y) - overall(x))
  const locked = new Set([gk1, gk2].filter(Boolean).map((p) => p._id))
  const rest = players.filter((p) => !locked.has(p._id))

  const results: Split[] = []
  for (let t = 0; t < tries; t++) {
    const shuffled = [...rest].sort(() => Math.random() - 0.5)
    const a = gk1 ? [gk1] : []
    const b = gk2 ? [gk2] : []
    for (const p of shuffled) (a.length <= b.length ? a : b).push(p)
    results.push(improve(a, b, locked))
  }

  const best = Math.min(...results.map((r) => r.diff))
  const good = results.filter((r) => r.diff <= best + 0.5)
  const pick = good[Math.floor(Math.random() * good.length)]
  return { a: pick.a, b: pick.b }
}
