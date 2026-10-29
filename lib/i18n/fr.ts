// Dizionario (fr): frase italiana (come scritta nel codice) → traduzione.
// Diviso per zone dell'app.
import { comune } from './fr/comune'
import { notifiche } from './fr/notifiche'
import { errori } from './fr/errori'
import { ingresso } from './fr/ingresso'
import { tornei } from './fr/tornei'
import { lega } from './fr/lega'
import { pro } from './fr/pro'
import { giocatori } from './fr/giocatori'
import { classifica } from './fr/classifica'
import { partite } from './fr/partite'

export const fr: Record<string, string> = { ...comune, ...partite, ...classifica, ...giocatori, ...pro, ...lega, ...tornei, ...ingresso, ...errori, ...notifiche }
