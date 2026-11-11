// Versione dei Termini d'uso e dell'Informativa privacy: se cambia, al prossimo accesso si accettano di nuovo.
export const VERSIONE_TERMINI = '2026-10-28'

/** I consensi di un account (nei dati privati di Clerk), ognuno con la data in cui è stato dato o tolto. */
export type Consensi = {
  termini?: { versione: string; il: string }
  immagini?: { si: boolean; il: string }
  /** passati: alla revoca, se i km già presi da Salute sono stati cancellati o tenuti per scelta */
  km?: { si: boolean; il: string; passati?: 'cancellati' | 'tenuti' }
}
