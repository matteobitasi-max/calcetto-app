import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Lo Studio ha il suo login Sanity, quindi non passa da Clerk.
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/studio(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
}
