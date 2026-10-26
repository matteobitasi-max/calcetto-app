// Descrizioni delle partite ricorrenti, usabili sia sul server sia nel browser (nella lingua di `t`).
import type { T } from './i18n'

export function giornoSettimana(day: string, t: T) {
  return new Intl.DateTimeFormat(t.locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
}

export const primaDi = (giorni: number, ora: string, t: T) =>
  giorni === 0
    ? t('il giorno stesso alle {ora}', { ora })
    : giorni === 1
      ? t('il giorno prima alle {ora}', { ora })
      : t('{n} giorni prima alle {ora}', { n: giorni, ora })

export function descriviRicorrenza(
  r: {
    primaData: string
    ora: string
    ogniSettimane: number
    aperturaGiorniPrima: number
    aperturaOra: string
    chiusuraGiorniPrima: number
    chiusuraOra: string
  },
  t: T,
) {
  const giorno = giornoSettimana(r.primaData, t)
  return {
    quando: r.ogniSettimane === 2 ? t('Ogni 2 settimane il {giorno} alle {ora}', { giorno, ora: r.ora }) : t('Ogni {giorno} alle {ora}', { giorno, ora: r.ora }),
    finestra: t('Convocazioni: aprono {apertura}, chiudono {chiusura}', {
      apertura: primaDi(r.aperturaGiorniPrima, r.aperturaOra, t),
      chiusura: primaDi(r.chiusuraGiorniPrima, r.chiusuraOra, t),
    }),
  }
}
