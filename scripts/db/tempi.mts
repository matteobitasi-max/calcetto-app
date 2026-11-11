// Tempo di calcolo delle interrogazioni GROQ: motore originale di groq-js e copia corretta (lib/vendor/groq-js),
// sugli stessi dati di Supabase (solo lettura). Controlla anche che i risultati siano identici.
//   set -a && . ./.env.local && set +a && npx tsx --conditions=react-server scripts/db/tempi.mts
import { evaluate as originale, parse } from 'groq-js'
import { evaluate as corretto } from '../../lib/vendor/groq-js'
import { sql } from '../../lib/db/supabase'

const dataset = (await sql()<{ doc: unknown }[]>`select doc from documenti order by id`).map((r) => r.doc as Record<string, unknown>)
const lega = dataset.find((d) => d._type === 'league')!._id
const utente = (dataset.find((d) => d._type === 'abbonamento') as { clerkUserId?: string })?.clerkUserId ?? 'x'
const torneo = dataset.find((d) => d._type === 'tournament')?._id ?? 'x'
const ABB = `_type == "abbonamento" && attivo != false && (!defined(scadenza) || scadenza > now())`
const COP = `*[_type == "player" && clerkUserId == ^.clerkUserId && isAdmin == true && attivo != false] | order(_createdAt asc)[0...5].lega._ref`
const prove: [string, string, Record<string, unknown>][] = [
  ['legaPro', `*[_type == "league" && _id == $id][0].pro == true || count(*[${ABB} && clerkUserId in *[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false].clerkUserId && $id in ${COP}]) > 0`, { id: lega }],
  ['ioPro', `*[_type == "league" && _id == $id][0].pro == true || count(*[${ABB} && clerkUserId == $utente && $id in ${COP}]) > 0`, { id: lega, utente }],
  ['organizzatoriPro', `*[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false && (*[_type == "league" && _id == $id][0].pro == true || clerkUserId in *[${ABB} && $id in ${COP}].clerkUserId)]._id`, { id: lega }],
  ['oltreLimitePro', `count(*[${ABB} && clerkUserId == $utente]) > 0 && count(*[_type == "player" && lega._ref == $id && clerkUserId == $utente && isAdmin == true && attivo != false]) > 0 && count(*[${ABB} && clerkUserId == $utente && $id in ${COP}]) == 0 && *[_type == "league" && _id == $id][0].pro != true`, { id: lega, utente }],
  ['rosa con pro', `*[_type == "player" && lega._ref == $id]{_id, nome, "pro": defined(clerkUserId) && count(*[_type == "abbonamento" && clerkUserId == ^.clerkUserId && attivo != false && (!defined(scadenza) || scadenza > now())]) > 0}`, { id: lega }],
  ['leghe con conteggi', `*[_type == "league"]{_id, nome, "giocatori": count(*[_type == "player" && lega._ref == ^._id && attivo != false]), "partite": count(*[_type == "match" && lega._ref == ^._id])}`, {}],
  ['tornei', `*[_type == "tournament" && lega._ref == $id]{_id, "primaPartita": *[_type == "match" && torneo._ref == ^._id] | order(data asc)[0].data, "partite": count(*[_type == "match" && torneo._ref == ^._id]), "giocate": count(*[_type == "match" && torneo._ref == ^._id && stato == "giocata"])}`, { id: lega }],
  ['promemoria', `*[_type == "match" && stato != "giocata"]{_id, "mancanti": *[_type == "player" && lega._ref == ^.lega._ref && attivo != false && !(_id in ^.convocazioni[].giocatore._ref)]._id}`, {}],
  ['partite con giocatori', `*[_type == "match" && lega._ref == $id] | order(data desc){..., convocazioni[]{..., giocatore->{nome, cognome, foto}}, marcatori[]{..., giocatore->{nome}}, mvp->{nome}}`, { id: lega }],
  ['torneo', `*[_id == $t][0]{..., "partite": *[_type == "match" && torneo._ref == ^._id]{_id, data}}`, { t: torneo }],
]
const ordina = (v: unknown) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x))
const misura = async (ev: typeof originale, q: string, params: Record<string, unknown>) => {
  const s = performance.now()
  const r = await (await ev(parse(q, { params }), { dataset, params })).get()
  return { ms: performance.now() - s, r }
}
let diversi = 0
console.log('interrogazione'.padEnd(24), 'prima', ' dopo')
for (const [nome, q, params] of prove) {
  const a = await misura(originale, q, params)
  const b = await misura(corretto, q, params)
  const uguale = ordina(a.r) === ordina(b.r)
  if (!uguale) diversi++
  console.log(nome.padEnd(24), `${a.ms.toFixed(0)}ms`.padStart(6), `${b.ms.toFixed(0)}ms`.padStart(6), uguale ? '✅ uguale' : '❌ DIVERSO')
}
console.log(diversi ? `❌ ${diversi} risultati diversi` : '✅ tutti i risultati identici')
await sql().end()
