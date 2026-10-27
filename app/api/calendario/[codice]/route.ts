import { sanity } from '@/lib/sanity'
import { utenteDelCodice } from '@/lib/calendario'
import { assicuraRicorrenze } from '@/lib/series'
import { creaT, isLingua, type T } from '@/lib/i18n'

// Il calendario del telefono (iPhone, Google, Outlook) si abbona a questo link e lo ricontrolla da
// solo: ci sono le partite di tutte le mie leghe, dagli ultimi due mesi in poi, e se una partita
// cambia o viene annullata l'evento si aggiorna.

type Partita = {
  _id: string
  _updatedAt: string
  data: string
  luogo?: string
  durataMinuti?: number
  stato?: string
  note?: string
  aperturaConvocazioni?: string
  chiusuraConvocazioni?: string
  lega?: string
  torneo?: string
  nomeA?: string
  nomeB?: string
  risultato?: { golA?: number; golB?: number }
  mia?: 'presente' | 'assente' | 'riserva'
}

const RISPOSTA = { presente: '✅ In lista', riserva: '⏳ In attesa', assente: '❌ Assente' } as const

export async function GET(request: Request, { params }: RouteContext<'/api/calendario/[codice]'>) {
  const { codice } = await params
  const utente = utenteDelCodice(codice.replace(/\.ics$/, ''))
  if (!utente) return new Response('Calendario non trovato', { status: 404 })
  const url = new URL(request.url)
  const lingua = url.searchParams.get('lingua')
  const t = creaT(isLingua(lingua) ? lingua : 'it')

  const schede = await sanity.fetch<{ _id: string; lega: string }[]>(
    `*[_type == "player" && clerkUserId == $utente && attivo != false && defined(lega->_id)]{_id, "lega": lega._ref}`,
    { utente },
  )
  const leghe = [...new Set(schede.map((s) => s.lega))]
  await Promise.all(leghe.map((legaId) => assicuraRicorrenze({ legaId })))
  const partite = leghe.length
    ? await sanity.fetch<Partita[]>(
        `*[_type == "match" && lega._ref in $leghe && data >= $da] | order(data asc){
          _id, _updatedAt, data, luogo, durataMinuti, stato, note, aperturaConvocazioni, chiusuraConvocazioni, nomeA, nomeB, risultato,
          "lega": lega->nome, "torneo": torneo->nome,
          "mia": convocazioni[giocatore._ref in $miei][0].risposta
        }`,
        { leghe, miei: schede.map((s) => s._id), da: new Date(Date.now() - 60 * 86_400_000).toISOString() },
      )
    : []

  const sito = `${url.protocol}//${request.headers.get('x-forwarded-host') ?? url.host}`
  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Cap//Calendario//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:The Cap',
    `X-WR-CALDESC:${testo(t('Le partite delle tue leghe su The Cap'))}`,
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...partite.flatMap((p) => evento(p, t, sito)),
    'END:VCALENDAR',
  ]
  return new Response(righe.map(piega).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="the-cap.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}

function evento(p: Partita, t: T, sito: string) {
  const inizio = new Date(p.data)
  const fine = new Date(inizio.getTime() + (p.durataMinuti ?? 60) * 60_000)
  const annullata = p.stato === 'annullata'
  const giocata = p.stato === 'giocata'
  const r = p.risultato
  const punteggio = giocata && r?.golA != null && r?.golB != null ? ` ${r.golA}–${r.golB}` : ''
  const titolo = p.torneo
    ? `🏆 ${p.torneo}: ${p.nomeA ?? '?'} – ${p.nomeB ?? '?'}${punteggio}`
    : `⚽ ${p.lega ?? 'The Cap'}${punteggio}`

  const descrizione = [
    p.mia ? t(RISPOSTA[p.mia]) : !annullata && !giocata && !p.torneo ? `❓ ${t('Non hai risposto')}` : null,
    convocazioni(p, t),
    p.note,
    `${sito}/partite/${p._id}`,
  ].filter(Boolean).join('\n')

  return [
    'BEGIN:VEVENT',
    `UID:${p._id}@thecap`,
    `DTSTAMP:${utc(new Date())}`,
    `LAST-MODIFIED:${utc(new Date(p._updatedAt))}`,
    `SEQUENCE:${Math.floor(new Date(p._updatedAt).getTime() / 1000) - 1_700_000_000}`,
    `DTSTART:${utc(inizio)}`,
    `DTEND:${utc(fine)}`,
    `SUMMARY:${testo(annullata ? `❌ ${t('Annullata')} · ${titolo}` : titolo)}`,
    ...(p.luogo ? [`LOCATION:${testo(p.luogo)}`] : []),
    `DESCRIPTION:${testo(descrizione)}`,
    `URL:${sito}/partite/${p._id}`,
    `STATUS:${annullata ? 'CANCELLED' : 'CONFIRMED'}`,
    // promemoria due ore prima (chi non lo vuole lo toglie dalle impostazioni del calendario)
    ...(annullata || giocata || p.mia === 'assente'
      ? []
      : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${testo(titolo)}`, 'TRIGGER:-PT2H', 'END:VALARM']),
    'END:VEVENT',
  ]
}

// Quando si risponde: da quando si aprono le convocazioni, o fino a quando restano aperte.
function convocazioni(p: Partita, t: T) {
  if (p.stato !== 'aperta' || !p.aperturaConvocazioni || !p.chiusuraConvocazioni) return null
  const ora = new Date()
  const quando = (iso: string) => t.data(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  if (new Date(p.aperturaConvocazioni) > ora) return t('Convocazioni dal {quando}', { quando: quando(p.aperturaConvocazioni) })
  if (new Date(p.chiusuraConvocazioni) > ora) return t('Convocazioni aperte fino a {quando}', { quando: quando(p.chiusuraConvocazioni) })
  return null
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// Testo di un campo .ics: virgole, punti e virgola e a capo vanno protetti.
const testo = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Le righe .ics vanno spezzate a 75 byte (senza tagliare a metà un carattere).
function piega(riga: string) {
  const parti: string[] = []
  let corrente = ''
  let byte = 0
  for (const c of riga) {
    const n = Buffer.byteLength(c)
    if (byte + n > (parti.length ? 74 : 75)) {
      parti.push(corrente)
      corrente = ''
      byte = 0
    }
    corrente += c
    byte += n
  }
  parti.push(corrente)
  return parti.join('\r\n ')
}
