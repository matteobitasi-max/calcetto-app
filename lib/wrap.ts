import 'server-only'
import { sanity } from './sanity'
import { getMemberships, type Membro } from './player'
import { getKmTotali, getPagelleLega, getPlayers, getPresenzeAllenamenti } from './matches'
import { classifica, type PartitaPunteggio } from './punteggio'
import { ALLENATORE, displayName } from './roster'
import type { Periodo, Stagione } from './stagioni'

// Il wrap di fine stagione: il riassunto della stagione appena terminata, per ogni giocatore (e la lega).
// Si calcola dalle partite del periodo, niente da salvare; si ricorda solo chi l'ha già aperto (wrapVisti).

// Il pop-up si propone per le stagioni chiuse da meno di questo tempo.
const PER_GIORNI = 45

const periodoDi = (s: Stagione): Periodo => ({ ...(s.dal && { dal: s.dal }), al: s.al })
const filtro = (p: Periodo) => `${p.dal ? ' && data >= $dal' : ''} && data < $al`
const allenatore = (m: Membro) => m.ruolo === ALLENATORE

// Ha fatto parte della stagione: ha giocato almeno una partita, era in lista a un allenamento o è l'allenatore.
async function haPartecipato(m: Membro, s: Stagione) {
  if (allenatore(m)) return true
  const p = periodoDi(s)
  return (
    (await sanity.fetch<number>(
      `count(*[_type == "match" && lega._ref == $lega${filtro(p)} && coalesce(stato, "aperta") != "annullata"
        && ($me in squadraA[]._ref || $me in squadraB[]._ref || (tipo == "allenamento" && $me in convocazioni[risposta == "presente"].giocatore._ref))])`,
      { lega: m.lega._id, me: m._id, ...p },
    )) > 0
  )
}

// Il wrap da proporre a chi apre l'app: l'ultima stagione chiusa (di recente) di una delle sue leghe,
// che non ha ancora aperto e di cui ha fatto parte.
export async function wrapDaProporre() {
  const leghe = (await getMemberships()).filter((m) => !m.ospite)
  const limite = Date.now() - PER_GIORNI * 86_400_000
  for (const m of leghe) {
    const ultima = [...(m.lega.stagioni ?? [])].sort((a, b) => a.al.localeCompare(b.al)).at(-1)
    if (!ultima || new Date(ultima.al).getTime() < limite || m.wrapVisti?.includes(ultima._key)) continue
    if (await haPartecipato(m, ultima)) return { chiave: ultima._key, stagione: ultima.nome, legaId: m.lega._id, lega: m.lega.nome }
  }
  return null
}

// La stagione (per chiave) tra quelle delle mie leghe, con la mia scheda in quella lega.
export async function stagioneMia(chiave: string) {
  for (const m of await getMemberships()) {
    const s = m.lega.stagioni?.find((x) => x._key === chiave)
    if (s) return { membro: m, stagione: s }
  }
  return null
}

type Partita = PartitaPunteggio & { data: string }

export type DatiWrap = {
  stagione: string
  lega: { id: string; nome: string; logo?: Membro['lega']['logo']; club: boolean }
  nome: string
  allenatore: boolean
  dal?: string
  al: string
  io: {
    giocate: number
    vinte: number
    pari: number
    perse: number
    gol: number
    mvp: number
    km: number | null
    pagella: { media: number; n: number } | null
    allenamenti: { presenze: number; totale: number } | null
    posizione: { pos: number; su: number; punti: number } | null
    marcatore: number | null
    migliore: { data: string; fatti: number; subiti: number; gol: number; mvp: boolean } | null
    compagno: { nome: string; insieme: number; vinte: number } | null
  } | null
  totali: {
    partite: number
    gol: number
    allenamenti: number | null
    km: number
    capocannoniere: { nome: string; gol: number } | null
    reMvp: { nome: string; mvp: number } | null
    stakanovista: { nome: string; giocate: number } | null
    primo: { nome: string; punti: number } | null
  }
}

export async function datiWrap(membro: Membro, stagione: Stagione): Promise<DatiWrap> {
  const legaId = membro.lega._id
  const club = !!membro.lega.club && membro.lega.tipo === 'squadra'
  const periodo = periodoDi(stagione)
  const [partite, giocatori, km, pagelle, allenamenti] = await Promise.all([
    sanity.fetch<Partita[]>(
      `*[_type == "match" && lega._ref == $lega${filtro(periodo)} && stato == "giocata" && defined(risultato.golA)] | order(data asc){
        data, "a": coalesce(squadraA[]._ref, []), "b": coalesce(squadraB[]._ref, []),
        "golA": risultato.golA, "golB": risultato.golB,
        "marcatori": coalesce(marcatori[]{"id": giocatore._ref, gol}, []), "mvp": mvp._ref
      }`,
      { lega: legaId, ...periodo },
    ),
    getPlayers(legaId),
    getKmTotali(legaId, periodo),
    club ? getPagelleLega(legaId, periodo) : null,
    club ? getPresenzeAllenamenti(legaId, periodo) : null,
  ])
  const nome = new Map(giocatori.map((g) => [g._id, displayName(g)]))

  // conti per giocatore: presenze, risultati, gol, MVP
  type Conto = { giocate: number; vinte: number; pari: number; perse: number; gol: number; mvp: number }
  const conti = new Map<string, Conto>()
  const conto = (id: string) => conti.get(id) ?? conti.set(id, { giocate: 0, vinte: 0, pari: 0, perse: 0, gol: 0, mvp: 0 }).get(id)!
  let golTotali = 0
  for (const m of partite) {
    golTotali += (m.golA ?? 0) + (m.golB ?? 0)
    for (const [squadra, fatti, subiti] of [
      [m.a, m.golA, m.golB],
      [m.b, m.golB, m.golA],
    ] as const) {
      for (const id of squadra) {
        const c = conto(id)
        c.giocate++
        if (fatti > subiti) c.vinte++
        else if (fatti < subiti) c.perse++
        else c.pari++
      }
    }
    for (const g of m.marcatori) if (g.id) conto(g.id).gol += g.gol ?? 0
    if (m.mvp) conto(m.mvp).mvp++
  }
  const conNome = [...conti].filter(([id]) => nome.has(id))
  const migliore = (k: keyof Conto) => {
    const [id, c] = conNome.sort((x, y) => y[1][k] - x[1][k])[0] ?? []
    return id && c && c[k] > 0 ? { nome: nome.get(id)!, valore: c[k] } : null
  }
  const tabella = classifica(partite).filter((r) => nome.has(r.id))
  const capo = migliore('gol')
  const re = migliore('mvp')
  const stak = migliore('giocate')
  const primo = tabella[0]

  const totali: DatiWrap['totali'] = {
    partite: partite.length,
    gol: golTotali,
    allenamenti: allenamenti ? allenamenti.totale : null,
    km: [...km.values()].reduce((s, x) => s + x.km, 0),
    capocannoniere: capo && { nome: capo.nome, gol: capo.valore },
    reMvp: re && { nome: re.nome, mvp: re.valore },
    stakanovista: stak && { nome: stak.nome, giocate: stak.valore },
    primo: primo ? { nome: nome.get(primo.id)!, punti: primo.punti } : null,
  }

  const me = membro._id
  const mio = conti.get(me)
  const presenzeAll = allenamenti?.per.get(me) ?? 0
  let io: DatiWrap['io'] = null
  if (!allenatore(membro) && (mio || presenzeAll > 0)) {
    // la partita migliore: più gol segnati, poi vittoria più larga
    let top: NonNullable<DatiWrap['io']>['migliore'] = null
    let punteggioTop = -Infinity
    // il compagno con cui ho giocato più volte nella stessa squadra
    const insieme = new Map<string, { n: number; vinte: number }>()
    for (const m of partite) {
      const inA = m.a.includes(me)
      if (!inA && !m.b.includes(me)) continue
      const fatti = inA ? m.golA : m.golB
      const subiti = inA ? m.golB : m.golA
      const gol = m.marcatori.filter((g) => g.id === me).reduce((s, g) => s + (g.gol ?? 0), 0)
      const voto = gol * 10 + (m.mvp === me ? 5 : 0) + (fatti - subiti)
      if (voto > punteggioTop) {
        punteggioTop = voto
        top = { data: m.data, fatti, subiti, gol, mvp: m.mvp === me }
      }
      for (const id of inA ? m.a : m.b) {
        if (id === me || !nome.has(id)) continue
        const x = insieme.get(id) ?? { n: 0, vinte: 0 }
        insieme.set(id, { n: x.n + 1, vinte: x.vinte + (fatti > subiti ? 1 : 0) })
      }
    }
    const [compId, comp] = [...insieme].sort((x, y) => y[1].n - x[1].n || y[1].vinte - x[1].vinte)[0] ?? []
    const riga = tabella.find((r) => r.id === me)
    const marcatori = conNome.filter(([, c]) => c.gol > 0).sort((x, y) => y[1].gol - x[1].gol)
    const posMarcatore = mio && mio.gol > 0 ? marcatori.filter(([, c]) => c.gol > mio.gol).length + 1 : null
    io = {
      giocate: mio?.giocate ?? 0,
      vinte: mio?.vinte ?? 0,
      pari: mio?.pari ?? 0,
      perse: mio?.perse ?? 0,
      gol: mio?.gol ?? 0,
      mvp: mio?.mvp ?? 0,
      km: km.get(me)?.km ?? null,
      pagella: pagelle?.get(me) ?? null,
      allenamenti: allenamenti && allenamenti.totale > 0 ? { presenze: presenzeAll, totale: allenamenti.totale } : null,
      posizione: riga ? { pos: riga.posizione, su: tabella.length, punti: riga.punti } : null,
      marcatore: posMarcatore,
      migliore: mio && mio.giocate > 0 ? top : null,
      compagno: compId && comp ? { nome: nome.get(compId)!, insieme: comp.n, vinte: comp.vinte } : null,
    }
  }

  return {
    stagione: stagione.nome,
    lega: { id: legaId, nome: membro.lega.nome, logo: membro.lega.logo, club },
    nome: displayName(membro),
    allenatore: allenatore(membro),
    ...(stagione.dal && { dal: stagione.dal }),
    al: stagione.al,
    io,
    totali,
  }
}
