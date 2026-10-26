// Dizionario inglese: frase italiana (come scritta nel codice) → traduzione.
// Diviso per zone dell'app.
import { comune } from './en/comune'
import { notifiche } from './en/notifiche'
import { errori } from './en/errori'
import { ingresso } from './en/ingresso'
import { tornei } from './en/tornei'
import { lega } from './en/lega'
import { pro } from './en/pro'
import { giocatori } from './en/giocatori'
import { classifica } from './en/classifica'
import { partite } from './en/partite'

export const en: Record<string, string> = { ...comune, ...partite, ...classifica, ...giocatori, ...pro, ...lega, ...tornei, ...ingresso, ...errori, ...notifiche }
