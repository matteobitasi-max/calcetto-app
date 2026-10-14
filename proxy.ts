import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Lo Studio ha il suo login Sanity, quindi non passa da Clerk. /accesso-app gestisce da sé
// chi non ha ancora fatto l'accesso (login delle app nel browser).
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/accesso-app(.*)', '/account-eliminato', '/studio(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect()
})

export const config = {
  // Privacy, Supporto ed Elimina account restano fuori da Clerk: gli store le controllano
  // con richieste automatiche, che non devono passare dai reindirizzamenti di accesso.
  matcher: ['/((?!_next|privacy|supporto|elimina-account|.*\\..*).*)', '/(api|trpc)(.*)'],
}
