import 'server-only'
import { getAllStats, getPagelleLega, getPlayers } from './matches'
import { periodoInCorso, type Stagione } from './stagioni'
import { SKILLS, displayName, indisponibileIl, isAllenatore, overall, type Player, type Skill } from './roster'
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

// Partite, gol, MVP e pagelle della stagione in corso (dall'ultima stagione terminata).
export async function righeRosa(legaId: string, club: boolean, ordine: Ordine = 'voto', stagioni?: Stagione[]): Promise<RigaRosa[]> {
  const periodo = periodoInCorso(stagioni)
  const [players, stats, pagelle] = await Promise.all([getPlayers(legaId), getAllStats(legaId, periodo), club ? getPagelleLega(legaId, periodo) : null])
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
  // gli allenatori in fondo, poi l'ordine scelto
  return righe.sort((a, b) => {
    const staff = Number(isAllenatore(a.player)) - Number(isAllenatore(b.player))
    if (staff) return staff
    const x = valore(a)
    const y = valore(b)
    const d = typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number)
    return crescente ? d : -d
  })
}
