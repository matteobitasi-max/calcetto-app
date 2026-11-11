// Copia tutti i dati di Sanity su Supabase: documenti (uguali, con le stesse revisioni) e file delle immagini
// (nell'archivio privato, con lo stesso identificativo). Si può rilanciare: ogni volta sostituisce tutto.
// Alla fine controlla che i documenti siano identici e che le interrogazioni diano gli stessi risultati.
//
//   set -a && . ./.env.local && set +a && npx tsx --conditions=react-server scripts/db/copia-da-sanity.mts

import { createHash } from 'node:crypto'
import { sql, archivioSupabase } from '../../lib/db/supabase'
import { leggiFile, salvaFile } from '../../lib/db/foto'
import type { Documento } from '../../lib/db/patch'

const P = process.env
const api = `https://${P.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2025-10-01`
const intest = { Authorization: `Bearer ${P.SANITY_API_TOKEN}` }

// 1. Tutti i documenti pubblicati da Sanity
const testo = await (await fetch(`${api}/data/export/${P.NEXT_PUBLIC_SANITY_DATASET}`, { headers: intest })).text()
const docs: Documento[] = testo
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((d: Documento) => !/^(drafts\.|versions\.|_\.)/.test(d._id))
const perTipo = (l: Documento[]) => Object.fromEntries(Object.entries(Object.groupBy(l, (d) => d._type)).map(([k, v]) => [k, v!.length]).sort())
console.log('da Sanity:', docs.length, 'documenti', perTipo(docs))

// 2. I file delle immagini nell'archivio privato (solo quelli che mancano o sono diversi)
let copiati = 0
for (const a of docs.filter((d) => d._type === 'sanity.imageAsset')) {
  const presente = await leggiFile(a._id)
  const sha = (b: Buffer) => createHash('sha1').update(b).digest('hex')
  if (presente && sha(presente.dati) === a.sha1hash) continue
  // dlRaw: il file originale (senza, il CDN dà una versione ricompressa)
  const r = await fetch(`${String(a.url)}?dlRaw=true`, { headers: intest })
  if (!r.ok) throw new Error(`Immagine ${a._id}: ${r.status}`)
  const dati = Buffer.from(await r.arrayBuffer())
  if (sha(dati) !== a.sha1hash) throw new Error(`Immagine ${a._id}: contenuto diverso da quello atteso`)
  await salvaFile(a._id, dati, String(a.mimeType ?? 'application/octet-stream'))
  copiati++
}
// nei documenti delle immagini non resta il link pubblico di Sanity
for (const a of docs.filter((d) => d._type === 'sanity.imageAsset')) {
  delete a.url
  a.path = `foto/${a._id}`
}
console.log('immagini copiate ora:', copiati)

// 3. Sostituisce tutto in una sola transazione
await sql().begin(async (tx) => {
  await tx`lock table documenti in exclusive mode`
  await tx`delete from documenti`
  for (const d of docs) {
    await tx`insert into documenti (id, tipo, doc, creato, aggiornato)
      values (${d._id}, ${d._type}, ${tx.json(d as never)}, ${d._createdAt ?? new Date().toISOString()}, ${d._updatedAt ?? new Date().toISOString()})`
  }
})

// 4. Controlli: documenti identici, poi le stesse interrogazioni su Sanity e su Supabase
const salvati = (await sql()<{ doc: Documento }[]>`select doc from documenti`).map((r) => r.doc)
const ordina = (v: unknown) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x))
const mappa = new Map(salvati.map((d) => [d._id, ordina(d)]))
const diversi = docs.filter((d) => mappa.get(d._id) !== ordina(d)).map((d) => d._id)
console.log('su Supabase:', salvati.length, 'documenti', perTipo(salvati))
console.log(diversi.length === 0 && salvati.length === docs.length ? '✅ documenti identici' : `❌ documenti diversi: ${diversi.join(', ')}`)

const lega = docs.find((d) => d._type === 'league')?._id
const interrogazioni: [string, Record<string, unknown>][] = [
  [`count(*[!(_id in path("_.**"))])`, {}],
  [`*[_type == "league"]{_id, nome, codiceInvito, pro} | order(_id)`, {}],
  [`*[_type == "player"]{_id, nome, cognome, isAdmin, attivo, "lega": lega->nome, "foto": foto.asset._ref} | order(_id)`, {}],
  [`*[_type == "match"] | order(data desc){_id, data, stato, risultato, "presenti": count(convocazioni[risposta == "presente"]), "km": math::sum(distanze[].km), "mvp": mvp->nome}`, {}],
  [`*[_type == "match" && lega._ref == $lega && stato == "giocata"]{_id, "marcatori": marcatori[]{gol, "chi": giocatore->nome}} | order(_id)`, { lega }],
  [`*[_type == "abbonamento"]{clerkUserId, attivo, scadenza} | order(clerkUserId)`, {}],
  [`*[_type == "series"]{_id, "lega": lega->nome} | order(_id)`, {}],
  [`count(*[_type == "sanity.imageAsset" && count(*[references(^._id)]) == 0])`, {}],
]
let uguali = 0
for (const [q, params] of interrogazioni) {
  const qs = Object.entries(params).map(([k, v]) => `&$${k}=${encodeURIComponent(JSON.stringify(v))}`).join('')
  const daSanity = (await (await fetch(`${api}/data/query/${P.NEXT_PUBLIC_SANITY_DATASET}?query=${encodeURIComponent(q)}${qs}`, { headers: intest })).json()).result
  const daSupabase = await archivioSupabase.fetch(q, params)
  const ok = ordina(daSanity) === ordina(daSupabase)
  uguali += Number(ok)
  if (!ok) console.log('❌', q.slice(0, 80), '\n   sanity  :', ordina(daSanity).slice(0, 200), '\n   supabase:', ordina(daSupabase).slice(0, 200))
}
console.log(uguali === interrogazioni.length ? `✅ interrogazioni uguali (${uguali}/${interrogazioni.length})` : `❌ interrogazioni uguali ${uguali}/${interrogazioni.length}`)
await sql().end()
