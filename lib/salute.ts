import { Capacitor, registerPlugin } from '@capacitor/core'

// Plugin nativo "Salute" dell'app: Apple Salute su iPhone (SalutePlugin in AppDelegate.swift),
// Health Connect su Android (SalutePlugin.kt). Restituisce i metri percorsi tra inizio e fine.
export const Salute = registerPlugin<{ distanza(o: { inizio: number; fine: number }): Promise<{ metri: number }> }>('Salute')

export const saluteDisponibile = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Salute')

// Il nome da mostrare: Apple Salute su iPhone, Health Connect su Android.
export const nomeSalute = () => (Capacitor.getPlatform() === 'android' ? 'Health Connect' : 'Apple Salute')

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
