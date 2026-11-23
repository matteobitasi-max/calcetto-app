import { Capacitor, registerPlugin } from '@capacitor/core'
import { registraConsensoKm } from '@/app/actions'
import { conferma } from '@/components/conferma'

// Plugin nativo "Salute" dell'app: Apple Salute su iPhone (SalutePlugin in AppDelegate.swift),
// Health Connect su Android (SalutePlugin.kt). Restituisce i metri percorsi tra inizio e fine.
// Su iPhone `fonte` dice da dove vengono: distanza, allenamento o passi (stima, per chi ha Garmin).
// Dalla versione 1.6 (build 22) su iPhone restituisce anche i dati grezzi: distanza e passi nell'orario e gli
// allenamenti a cavallo della partita. Le regole per contarli stanno qui (metriPartita), così si cambiano dal sito.
type AllenamentoSalute = { inizio: number; fine: number; metri: number }
type LetturaSalute = { metri: number; fonte?: string; distanza?: number; passi?: number; allenamenti?: AllenamentoSalute[] }
export const Salute = registerPlugin<{ distanza(o: { inizio: number; fine: number }): Promise<LetturaSalute> }>('Salute')

// L'orologio (es. Garmin) si avvia quando si entra in campo e si ferma a fine partita, che spesso comincia
// o finisce dopo l'orario scritto in The Cap: un allenamento a cavallo della partita conta intero se parte
// al massimo 30 minuti prima e finisce al massimo un'ora dopo; uno più lungo solo per la parte dentro l'orario.
const PRIMA_MS = 30 * 60_000
const DOPO_MS = 60 * 60_000

function metriAllenamento(a: AllenamentoSalute, inizio: number, fine: number) {
  const durata = a.fine - a.inizio
  const dentro = Math.min(a.fine, fine) - Math.max(a.inizio, inizio)
  if (durata <= 0 || dentro <= 0 || !(a.metri > 0)) return 0
  const intero = a.inizio >= inizio - PRIMA_MS && a.fine <= fine + DOPO_MS
  return intero ? a.metri : a.metri * Math.min(1, dentro / durata)
}

/** Per capire da dove vengono i km: Salute letta a fette di 10 minuti, da mezz'ora prima a un'ora dopo la partita.
 *  Solo sul telefono, non si salva e non si invia niente. */
export async function fetteSalute(inizio: number, fine: number) {
  const passo = 10 * 60_000
  const fette: { da: number; a: number; metri: number; fonte?: string }[] = []
  for (let da = inizio - PRIMA_MS; da < fine + DOPO_MS; da += passo) {
    const r = await Salute.distanza({ inizio: da, fine: da + passo }).catch(() => null)
    fette.push({ da, a: da + passo, metri: r?.metri ?? 0, fonte: r?.fonte })
  }
  const tutto = await Salute.distanza({ inizio, fine }).catch(() => null)
  return { fette, totale: tutto?.metri ?? 0, fonte: tutto?.fonte, grezzi: tutto }
}

/** I metri della partita da Salute / Health Connect: il più alto tra distanza, allenamento dell'orologio e passi. */
export async function metriPartita(inizio: number, fine: number): Promise<{ metri: number; fonte?: string }> {
  const r = await Salute.distanza({ inizio, fine })
  // app nuova: dati grezzi, si applicano le regole qui
  if (Array.isArray(r.allenamenti)) {
    const allenamento = Math.max(0, ...r.allenamenti.map((a) => metriAllenamento(a, inizio, fine)))
    const distanza = r.distanza ?? 0
    const passi = r.passi ?? 0
    const metri = Math.max(distanza, allenamento, passi, r.metri)
    return { metri, fonte: metri === allenamento ? 'allenamento' : metri === distanza ? 'distanza' : metri === passi ? 'passi' : r.fonte }
  }
  // app di prima su iPhone: conta solo la parte di allenamento dentro l'orario. Se a vincere è un allenamento,
  // si rilegge su un orario più largo (30 minuti prima, un'ora dopo) per prenderlo intero.
  // Solo se il risultato è coerente con quell'allenamento: almeno metà dell'allenamento cade nell'orario, quindi
  // intero è al massimo il doppio di quanto visto dentro (altrimenti è un altro dato, es. il totale del giorno).
  if (r.fonte === 'allenamento') {
    const largo = await Salute.distanza({ inizio: inizio - PRIMA_MS, fine: fine + DOPO_MS }).catch(() => null)
    if (largo?.fonte === 'allenamento' && largo.metri > r.metri && largo.metri <= r.metri * 2) return { metri: largo.metri, fonte: 'allenamento' }
  }
  return { metri: r.metri, fonte: r.fonte }
}

export const saluteDisponibile = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Salute')

// Il nome da mostrare: Apple Salute su iPhone, Health Connect su Android.
// Su iPhone il nome ufficiale "Apple Health" (in italiano l'app si chiama Salute), come chiede Apple.
export const nomeSalute = () => (Capacitor.getPlatform() === 'android' ? 'Health Connect' : 'Apple Health')

// Meno di 1 km per ogni ora di partita: in campo non c'era nessun tracker addosso (telefono in borsa).
// Questi km non si salvano da soli: si chiede al giocatore se inserirli comunque.
export const pochiKm = (metri: number, inizio: number, fine: number) => metri < (fine - inizio) / 3600

// Preferenze su questo telefono: km automatici attivi e partite da non ricompilare (km tolti a mano).
const AUTO = 'km-salute-auto'
const ESCLUSE = 'km-salute-escluse'

const leggi = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const scrivi = (k: string, v: string | null) => {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {}
}

export const kmAutomatici = () => leggi(AUTO) === '1'
export const impostaKmAutomatici = (attivi: boolean) => scrivi(AUTO, attivi ? '1' : null)

export const partiteEscluse = (): string[] => JSON.parse(leggi(ESCLUSE) ?? '[]')
export const escludiPartita = (matchId: string) => scrivi(ESCLUSE, JSON.stringify([...new Set([...partiteEscluse(), matchId])].slice(-50)))
// km presi di nuovo a mano da Salute: da qui in poi i km automatici possono aggiornarli
export const includiPartita = (matchId: string) => scrivi(ESCLUSE, JSON.stringify(partiteEscluse().filter((id) => id !== matchId)))

// "Lascia stare" sull'avviso dei pochi km: nasconde solo l'avviso. Se poi arrivano i dati dell'orologio
// (Garmin e simili scrivono in Salute quando si sincronizzano, anche dopo la partita) i km si prendono lo stesso.
const AVVISI = 'km-salute-avviso-nascosto'
export const avvisiNascosti = (): string[] => JSON.parse(leggi(AVVISI) ?? '[]')
export const nascondiAvviso = (matchId: string) => scrivi(AVVISI, JSON.stringify([...new Set([...avvisiNascosti(), matchId])].slice(-50)))

// Consenso esplicito prima di leggere i km (dati legati alla salute): chiesto una volta su questo telefono
// e registrato sull'account con la data; disattivando i km si registra la revoca.
const CONSENSO = 'km-salute-consenso'
export async function chiediConsensoKm(testo: string, ok?: string) {
  if (leggi(CONSENSO) === '1') return true
  if (!(await conferma({ testo, ok }))) return false
  scrivi(CONSENSO, '1')
  registraConsensoKm(true).catch(() => undefined)
  return true
}
export function revocaConsensoKm(cancellaPassati: boolean) {
  scrivi(CONSENSO, null)
  return registraConsensoKm(false, cancellaPassati ? 'cancellati' : 'tenuti').catch(() => undefined)
}
