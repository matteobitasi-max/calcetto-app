// Dizionario (es): frase italiana (come scritta nel codice) → traduzione.
// Diviso per zone dell'app.
import { comune } from './es/comune'
import { notifiche } from './es/notifiche'
import { errori } from './es/errori'
import { ingresso } from './es/ingresso'
import { tornei } from './es/tornei'
import { lega } from './es/lega'
import { pro } from './es/pro'
import { giocatori } from './es/giocatori'
import { classifica } from './es/classifica'
import { partite } from './es/partite'

export const es: Record<string, string> = { ...comune, ...partite, ...classifica, ...giocatori, ...pro, ...lega, ...tornei, ...ingresso, ...errori, ...notifiche }
