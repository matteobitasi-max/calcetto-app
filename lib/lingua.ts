import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { COOKIE_LINGUA, creaT, isLingua, type Lingua } from './i18n'

// La lingua scelta (cookie); finché non c'è, quella del telefono: italiano o, per tutte le altre, inglese.
export const getLingua = cache(async (): Promise<Lingua> => {
  const scelta = (await cookies()).get(COOKIE_LINGUA)?.value
  // finché non si sceglie: italiano
  return isLingua(scelta) ? scelta : 'it'
})

// Ho già scelto la lingua? (al primo accesso dopo il login si chiede)
export const linguaScelta = async () => isLingua((await cookies()).get(COOKIE_LINGUA)?.value)

export const getT = async () => creaT(await getLingua())
