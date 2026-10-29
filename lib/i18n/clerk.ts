import { deDE, enUS, esES, frFR, itIT } from '@clerk/localizations'
import type { Lingua } from '.'

// Le schermate di accesso di Clerk nella lingua dell'app, con il nome The Cap e la spiegazione
// per chi arriva la prima volta (accesso e registrazione sono due schede: components/schede-accesso.tsx).
const TESTI = {
  it: {
    base: itIT,
    titolo: 'Benvenuto su The Cap',
    sotto: 'Con Google, Apple o la tua email. Prima volta? Tocca «Registrati».',
    nuovo: 'Crea il tuo account The Cap',
    nuovoSotto: 'Con Google o Apple è un attimo. Con l’email ti mandiamo un codice per confermare.',
    sconosciuta: 'Nessun account con questa email. Se è la prima volta, tocca «Registrati» qui sopra.',
  },
  en: {
    base: enUS,
    titolo: 'Welcome to The Cap',
    sotto: 'With Google, Apple or your email. First time? Tap “Sign up”.',
    nuovo: 'Create your The Cap account',
    nuovoSotto: 'With Google or Apple it takes a second. With email we send you a code to confirm.',
    sconosciuta: 'No account with this email. If this is your first time, tap “Sign up” above.',
  },
  es: {
    base: esES,
    titolo: 'Bienvenido a The Cap',
    sotto: 'Con Google, Apple o tu correo. ¿Primera vez? Toca «Regístrate».',
    nuovo: 'Crea tu cuenta de The Cap',
    nuovoSotto: 'Con Google o Apple es un momento. Con el correo te enviamos un código para confirmar.',
    sconosciuta: 'No hay ninguna cuenta con este correo. Si es tu primera vez, toca «Regístrate» arriba.',
  },
  de: {
    base: deDE,
    titolo: 'Willkommen bei The Cap',
    sotto: 'Mit Google, Apple oder deiner E-Mail. Zum ersten Mal hier? Tippe auf „Registrieren“.',
    nuovo: 'Erstelle dein The Cap-Konto',
    nuovoSotto: 'Mit Google oder Apple geht es sofort. Per E-Mail schicken wir dir einen Bestätigungscode.',
    sconosciuta: 'Kein Konto mit dieser E-Mail. Wenn du zum ersten Mal hier bist, tippe oben auf „Registrieren“.',
  },
  fr: {
    base: frFR,
    titolo: 'Bienvenue sur The Cap',
    sotto: 'Avec Google, Apple ou ton e-mail. Première fois ? Touche « S’inscrire ».',
    nuovo: 'Crée ton compte The Cap',
    nuovoSotto: 'Avec Google ou Apple, c’est immédiat. Par e-mail, on t’envoie un code de confirmation.',
    sconosciuta: 'Aucun compte avec cet e-mail. Si c’est ta première fois, touche « S’inscrire » ci-dessus.',
  },
} as const

export function localizzazioneClerk(lingua: Lingua) {
  const { base, titolo, sotto, nuovo, nuovoSotto, sconosciuta } = TESTI[lingua]
  return {
    ...base,
    unstable__errors: { ...base.unstable__errors, form_identifier_not_found: sconosciuta },
    signIn: { ...base.signIn, start: { ...base.signIn?.start, title: titolo, titleCombined: titolo, subtitle: sotto, subtitleCombined: sotto } },
    signUp: { ...base.signUp, start: { ...base.signUp?.start, title: nuovo, titleCombined: nuovo, subtitle: nuovoSotto, subtitleCombined: nuovoSotto } },
  }
}
