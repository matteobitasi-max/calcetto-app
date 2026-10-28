import { enUS, itIT } from '@clerk/localizations'
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
