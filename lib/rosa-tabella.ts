import 'server-only'
import { getAllStats, getPagelleLega, getPlayers } from './matches'
import { SKILLS, displayName, indisponibileIl, overall, type Player, type Skill } from './roster'
import { isoToRomeLocal } from './dates'

// La rosa come tabella (vista da computer ed esportazione): una riga per giocatore attivo.
export type RigaRosa = {
  player: Player
  nome: string
  numero?: number
  ruolo?: string
  voto: number
  skill: Record<Skill, number>
  partite: number
  gol: number
  mvp: number
  pagella: number | null
  fuori: boolean
}

export const COLONNE_ORDINE = ['numero', 'nome', 'ruolo', 'voto', 'partite', 'gol', 'mvp', 'pagella', ...(Object.keys(SKILLS) as Skill[])] as const
export type Ordine = (typeof COLONNE_ORDINE)[number]

export async function righeRosa(legaId: string, club: boolean, ordine: Ordine = 'voto'): Promise<RigaRosa[]> {
  const [players, stats, pagelle] = await Promise.all([getPlayers(legaId), getAllStats(legaId), club ? getPagelleLega(legaId) : null])
  const oggi = isoToRomeLocal(new Date().toISOString()).slice(0, 10)
  const righe = players
    .filter((p) => p.attivo !== false)
    .map((p) => {
      const s = stats.get(p._id)
      return {
        player: p,
        nome: displayName(p),
        numero: p.numero,
        ruolo: p.ruolo,
        voto: overall(p),
        skill: Object.fromEntries((Object.keys(SKILLS) as Skill[]).map((k) => [k, p.caratteristiche?.[k] ?? 5])) as Record<Skill, number>,
        partite: s?.giocate ?? 0,
        gol: s?.gol ?? 0,
        mvp: s?.mvp ?? 0,
        pagella: pagelle?.get(p._id)?.media ?? null,
        fuori: indisponibileIl(p, oggi),
      }
    })
  // testo in ordine alfabetico (crescente), numero di maglia crescente, tutti gli altri numeri dal più alto
  const valore = (r: RigaRosa): number | string =>
    ordine === 'nome' ? r.nome.toLowerCase() : ordine === 'ruolo' ? (r.ruolo ?? '~') : ordine === 'numero' ? (r.numero ?? 999) : ordine in r.skill ? r.skill[ordine as Skill] : ((r[ordine as keyof RigaRosa] as number | null) ?? -1)
  const crescente = ordine === 'nome' || ordine === 'ruolo' || ordine === 'numero'
  return righe.sort((a, b) => {
    const x = valore(a)
    const y = valore(b)
    const d = typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number)
    return crescente ? d : -d
  })
}
