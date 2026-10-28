import { enUS, itIT } from '@clerk/localizations'
import type { Lingua } from '.'

// Le schermate di accesso di Clerk nella lingua dell'app, con il nome The Cap e la spiegazione
// per chi arriva la prima volta (accesso e registrazione sono la stessa schermata).
const TESTI = {
  it: {
    base: itIT,
    titolo: 'Entra in The Cap',
    sotto: 'Nuovo? Scrivi la tua email o usa Google o Apple: l’account si crea da solo.',
    nuovo: 'Crea il tuo account The Cap',
    nuovoSotto: 'Ti basta email e password: poi ti mandiamo un codice per confermare.',
  },
  en: {
    base: enUS,
    titolo: 'Sign in to The Cap',
    sotto: 'New here? Enter your email or use Google or Apple: your account is created automatically.',
    nuovo: 'Create your The Cap account',
    nuovoSotto: 'Just an email and a password: then we send you a code to confirm.',
  },
} as const

export function localizzazioneClerk(lingua: Lingua) {
  const { base, titolo, sotto, nuovo, nuovoSotto } = TESTI[lingua]
  return {
    ...base,
    signIn: { ...base.signIn, start: { ...base.signIn?.start, title: titolo, titleCombined: titolo, subtitle: sotto, subtitleCombined: sotto } },
    signUp: { ...base.signUp, start: { ...base.signUp?.start, title: nuovo, titleCombined: nuovo, subtitle: nuovoSotto, subtitleCombined: nuovoSotto } },
  }
}
