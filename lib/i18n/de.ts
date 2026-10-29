// Dizionario (de): frase italiana (come scritta nel codice) → traduzione.
// Diviso per zone dell'app.
import { comune } from './de/comune'
import { notifiche } from './de/notifiche'
import { errori } from './de/errori'
import { ingresso } from './de/ingresso'
import { tornei } from './de/tornei'
import { lega } from './de/lega'
import { pro } from './de/pro'
import { giocatori } from './de/giocatori'
import { classifica } from './de/classifica'
import { partite } from './de/partite'

export const de: Record<string, string> = { ...comune, ...partite, ...classifica, ...giocatori, ...pro, ...lega, ...tornei, ...ingresso, ...errori, ...notifiche }
