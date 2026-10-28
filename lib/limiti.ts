// Numero massimo di giocatori in lista quando si crea una partita. L'organizzatore
// può poi aggiungere persone dalla lista d'attesa, superando questo limite.
export const MAX_GIOCATORI = 14

// "In base alle convocazioni": si convoca chi vuole fino a questo tetto (9 contro 9); oltre si va in lista d'attesa.
export const MAX_ISCRITTI = 18

// Alla chiusura si gioca con un numero pari: 18 iscritti → 9 contro 9,
// 11 iscritti → 5 contro 5 e l'ultimo arrivato in lista d'attesa.
export function formatoDaIscritti(iscritti: number) {
  const giocano = Math.min(MAX_ISCRITTI, iscritti - (iscritti % 2))
  return { giocano, perSquadra: giocano / 2, inAttesa: Math.max(0, iscritti - giocano) }
}

// Quanto restano aperte le convocazioni (minuti, etichetta). Sta qui e non nel modulo del browser
// (quando-fields) perché lo usa anche la pagina della serie, che è sul server.
export const DURATE_FINESTRA = [
  [60, '1 ora'],
  [120, '2 ore'],
  [180, '3 ore'],
  [360, '6 ore'],
  [720, '12 ore'],
  [1440, '1 giorno'],
  [2880, '2 giorni'],
] as const
