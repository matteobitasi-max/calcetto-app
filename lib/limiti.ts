// Numero massimo di giocatori in lista quando si crea una partita. L'organizzatore
// può poi aggiungere persone dalla lista d'attesa, superando questo limite.
export const MAX_GIOCATORI = 14

// "In base alle convocazioni": nessun tetto, si convoca chi vuole (fino a questo limite di sicurezza).
export const MAX_ISCRITTI = 40

// Alla chiusura si gioca con un numero pari: 18 iscritti → 9 contro 9,
// 11 iscritti → 5 contro 5 e l'ultimo arrivato in lista d'attesa.
export function formatoDaIscritti(iscritti: number) {
  const giocano = Math.min(MAX_ISCRITTI, iscritti - (iscritti % 2))
  return { giocano, perSquadra: giocano / 2, inAttesa: Math.max(0, iscritti - giocano) }
}
