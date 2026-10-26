import { leggiStato, salvaCollegamento } from '@/lib/strava'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'

// Strava rimanda qui dopo "Collega Strava" (anche nel browser di sistema, senza accesso a TheCap:
// chi si collega è scritto nello "state" firmato). Poi si torna nell'app o alla pagina di partenza.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const stato = leggiStato(url.searchParams.get('state'))
  const t = await getT()
  if (!stato) return pagina(t('Il collegamento è scaduto: riprova da TheCap.'), null, t)

  const code = url.searchParams.get('code')
  const permesso = url.searchParams.get('scope')?.includes('activity:read')
  let ok = false
  if (code && permesso) {
    try {
      await salvaCollegamento(stato.u, code)
      ok = true
    } catch {
      ok = false
    }
  }

  const torna = stato.torna.startsWith('/') ? stato.torna : '/'
  if (!stato.app) return Response.redirect(new URL(`${torna}${torna.includes('?') ? '&' : '?'}strava=${ok ? 'ok' : 'no'}`, url), 303)
  return pagina(
    ok ? `${t('Strava collegato')} ✅` : t('Strava non collegato: serve il permesso di leggere le attività.'),
    `thecap://strava?ok=${ok ? 1 : 0}&torna=${encodeURIComponent(torna)}`,
    t,
  )
}

// Pagina minima nel browser di sistema: torna da sola nell'app (o con il pulsante).
function pagina(messaggio: string, app: string | null, t: T) {
  const html = `<!doctype html><html lang="${t.lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Cap · Strava</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;text-align:center;background:#fafafa;color:#18181b}
a{display:inline-block;margin-top:16px;padding:14px 28px;border-radius:12px;background:#16a34a;color:#fff;font-weight:600;text-decoration:none}</style></head>
<body><div><img src="/icon-512.png" width="80" height="80" style="border-radius:22%" alt=""><p style="font-size:18px">${messaggio}</p>
${app ? `<a href="${app}">${t('Torna nell’app')}</a><script>location.href=${JSON.stringify(app)}</script>` : ''}</div></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
