// Descrizioni delle partite ricorrenti, usabili sia sul server sia nel browser.

export function giornoSettimana(day: string) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
}

export const primaDi = (giorni: number, ora: string) =>
  `${giorni === 0 ? 'il giorno stesso' : giorni === 1 ? 'il giorno prima' : `${giorni} giorni prima`} alle ${ora}`

export function descriviRicorrenza(r: {
  primaData: string
  ora: string
  ogniSettimane: number
  aperturaGiorniPrima: number
  aperturaOra: string
  chiusuraGiorniPrima: number
  chiusuraOra: string
}) {
  return {
    quando: `Ogni ${r.ogniSettimane === 2 ? '2 settimane il' : ''} ${giornoSettimana(r.primaData)} alle ${r.ora}`.replace(/\s+/g, ' '),
    finestra: `Convocazioni: aprono ${primaDi(r.aperturaGiorniPrima, r.aperturaOra)}, chiudono ${primaDi(r.chiusuraGiorniPrima, r.chiusuraOra)}`,
  }
}
