import { NextResponse } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { COOKIE_LINGUA } from '@/lib/i18n/cookie'

// Lo Studio ha il suo login Sanity, quindi non passa da Clerk. /api/cron si protegge con CRON_SECRET, /api/calendario con il codice firmato. /accesso-app gestisce da sé
// chi non ha ancora fatto l'accesso (login delle app nel browser).
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/accesso-app(.*)', '/account-eliminato', '/api/strava/callback', '/api/cron/(.*)', '/api/calendario/(.*)', '/studio(.*)'])

// Al primo accesso dopo il login (o su un telefono nuovo) si sceglie la lingua: solo per le pagine
// aperte nel browser, non per i dati delle pagine o le azioni.
const senzaScelta = createRouteMatcher(['/lingua', '/sign-in(.*)', '/accesso-app(.*)', '/account-eliminato', '/api/(.*)', '/studio(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect()
  const pagina = req.method === 'GET' && req.headers.get('accept')?.includes('text/html') && !req.headers.get('rsc')
  if (pagina && !senzaScelta(req) && !req.cookies.get(COOKIE_LINGUA) && (await auth()).userId) {
    const url = new URL('/lingua', req.url)
    url.searchParams.set('dopo', req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }
})

export const config = {
  // Privacy, Supporto ed Elimina account restano fuori da Clerk: gli store le controllano
  // con richieste automatiche, che non devono passare dai reindirizzamenti di accesso.
  matcher: ['/((?!_next|privacy|supporto|elimina-account|.*\\..*).*)', '/(api|trpc)(.*)'],
}
