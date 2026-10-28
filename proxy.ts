import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Lo Studio ha il suo login Sanity, quindi non passa da Clerk. /api/cron si protegge con CRON_SECRET, /api/calendario con il codice firmato,
// /api/revenuecat con REVENUECAT_WEBHOOK_AUTH. Gli inviti si aprono anche senza accesso (per scaricare l'app). /accesso-app gestisce da sé
// chi non ha ancora fatto l'accesso (login delle app nel browser).
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/accesso-app(.*)', '/invito/(.*)', '/invito-torneo/(.*)', '/invito-squadra/(.*)', '/account-eliminato', '/api/strava/callback', '/api/cron/(.*)', '/api/calendario/(.*)', '/api/revenuecat', '/studio(.*)'])

const conClerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect()
})

// L'accesso di produzione di Clerk funziona solo su thecapfc.app: chi apre ancora il vecchio indirizzo
// (le app installate prima della 1.3) trova l'invito ad aggiornare. Finché Clerk è in prova non cambia niente.
const vecchioIndirizzo = (req: NextRequest) =>
  req.nextUrl.hostname.endsWith('.vercel.app') &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live') &&
  req.headers.get('accept')?.includes('text/html')

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  // i link d'invito già mandati col vecchio indirizzo si aprono nel browser: lì si va sul sito nuovo
  if (vecchioIndirizzo(req) && /^\/invito/.test(req.nextUrl.pathname)) return NextResponse.redirect(`https://www.thecapfc.app${req.nextUrl.pathname}`)
  if (vecchioIndirizzo(req)) return new NextResponse(PAGINA_SPOSTATI, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  return conClerk(req, ev)
}

const PAGINA_SPOSTATI = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Cap</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#bfe3ba;color:#14532d;text-align:center}main{max-width:22rem;padding:1.5rem}img{width:96px;border-radius:22%}a{display:block;margin-top:1.5rem;padding:.8rem;border-radius:.8rem;background:#16a34a;color:#fff;font-weight:600;text-decoration:none}p{color:#3f6212}</style></head>
<body><main><img src="/icon-512.png" alt=""><h1>Aggiorna The Cap</h1><p>Abbiamo un nuovo indirizzo. Se usi l’app, aggiornala dall’App Store o da Google Play. Dal browser, continua qui:</p><p lang="en"><small>We have moved. Please update the app from the store, or continue in your browser:</small></p><a href="https://www.thecapfc.app/">www.thecapfc.app</a></main></body></html>`

export const config = {
  // Privacy, Termini, Supporto ed Elimina account restano fuori da Clerk: gli store le controllano
  // con richieste automatiche, che non devono passare dai reindirizzamenti di accesso.
  matcher: ['/((?!_next|privacy|termini|supporto|elimina-account|.*\\..*).*)', '/(api|trpc)(.*)'],
}
