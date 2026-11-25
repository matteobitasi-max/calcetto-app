// Il Club di una lega quando l'abbonamento di chi l'ha acceso finisce (e nessun altro organizzatore della lega
// ha il Club da passarle): la squadra NON torna da sola "tra amici".
// - per TOLLERANZA_GIORNI tutto funziona come prima, con un avviso "rinnova";
// - poi è in sola lettura: pagelle, formazioni, convocati e indisponibili si vedono ma non si cambiano.
// Rinnovando torna tutto attivo; altrimenti l'allenatore può rimettere la lega "tra amici" quando vuole.
export const TOLLERANZA_GIORNI = 14

export type StatoClub = 'attivo' | 'tolleranza' | 'sola-lettura'

export function statoClub(clubScadeIl?: string | null, ora = Date.now()): StatoClub {
  if (!clubScadeIl) return 'attivo'
  return new Date(clubScadeIl).getTime() + TOLLERANZA_GIORNI * 86_400_000 > ora ? 'tolleranza' : 'sola-lettura'
}

// Fino a quando si può ancora modificare (fine della tolleranza).
export const fineTolleranza = (clubScadeIl: string) => new Date(new Date(clubScadeIl).getTime() + TOLLERANZA_GIORNI * 86_400_000).toISOString()
