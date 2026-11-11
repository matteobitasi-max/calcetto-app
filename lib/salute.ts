import { Capacitor, registerPlugin } from '@capacitor/core'
import { registraConsensoKm } from '@/app/actions'
import { conferma } from '@/components/conferma'

// Plugin nativo "Salute" dell'app: Apple Salute su iPhone (SalutePlugin in AppDelegate.swift),
// Health Connect su Android (SalutePlugin.kt). Restituisce i metri percorsi tra inizio e fine.
export const Salute = registerPlugin<{ distanza(o: { inizio: number; fine: number }): Promise<{ metri: number }> }>('Salute')

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
