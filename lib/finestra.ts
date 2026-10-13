// Stato della finestra delle convocazioni (senza dipendenze dal server).
type ConFinestra = { stato: 'aperta' | 'chiusa' | 'giocata' | 'annullata'; aperturaConvocazioni: string; chiusuraConvocazioni: string }

export type Finestra = 'non_ancora' | 'aperta' | 'scaduta' | 'chiusa'

// Se i giocatori possono convocarsi adesso. "scaduta" = orario passato ma
// l'organizzatore non ha ancora chiuso ufficialmente le convocazioni.
export function finestra(m: ConFinestra, now = new Date()): Finestra {
  if (m.stato !== 'aperta') return 'chiusa'
  if (m.aperturaConvocazioni && now < new Date(m.aperturaConvocazioni)) return 'non_ancora'
  if (m.chiusuraConvocazioni && now >= new Date(m.chiusuraConvocazioni)) return 'scaduta'
  return 'aperta'
}
