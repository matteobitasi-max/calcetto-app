// Collaudo dell'archivio su Supabase (lib/db/supabase.ts): scritture, conflitti, riferimenti, foto.
// Modifica i dati su Supabase: dopo, rilanciare scripts/db/copia-da-sanity.mts per rimettere la copia esatta.
//
//   set -a && . ./.env.local && set +a && npx tsx --conditions=react-server scripts/db/collaudo.mts

import sharp from 'sharp'
import { archivioSupabase as db, sql } from '../../lib/db/supabase'
import { leggiFile, linkFoto, linkValido } from '../../lib/db/foto'

let ok = 0
let ko = 0
const verifica = (nome: string, condizione: boolean, dettaglio?: unknown) => {
  if (condizione) ok++
  else ko++
  console.log(condizione ? '✅' : '❌', nome, condizione ? '' : (dettaglio ?? ''))
}
const errore = async (f: () => Promise<unknown>) => {
  try {
    await f()
    return null
  } catch (e) {
    return e as { statusCode?: number; message: string }
  }
}

const partita = await db.fetch<{ _id: string; _rev: string; convocazioni?: { giocatore?: { _ref: string } }[] }>(
  `*[_type == "match" && count(convocazioni) > 0] | order(data desc)[0]{_id, _rev, convocazioni}`,
)
const giocatore = partita.convocazioni!.find((c) => c.giocatore)!.giocatore!._ref

// 1. modifica e rilettura (la cache si aggiorna)
const dopo = (await db.patch(partita._id).set({ notaCollaudo: 'uno' }).commit())!
verifica('modifica: nuova revisione', dopo._rev !== partita._rev)
verifica('rilettura vede la modifica', (await db.fetch(`*[_id == $id][0].notaCollaudo`, { id: partita._id })) === 'uno')

// 2. controllo di versione: con la revisione vecchia la modifica è rifiutata
const vecchia = await errore(() => db.patch(partita._id).ifRevisionId(partita._rev).set({ notaCollaudo: 'due' }).commit())
verifica('revisione vecchia rifiutata (409)', vecchia?.statusCode === 409, vecchia)
verifica('revisione giusta accettata', !(await errore(() => db.patch(partita._id).ifRevisionId(dopo._rev!).set({ notaCollaudo: 'tre' }).commit())))

// 3. due modifiche nello stesso istante con la stessa revisione: ne passa una sola
const rev = await db.fetch<string>(`*[_id == $id][0]._rev`, { id: partita._id })
const esiti = await Promise.all(['a', 'b'].map((v) => errore(() => db.patch(partita._id).ifRevisionId(rev).set({ notaCollaudo: v }).commit())))
verifica('modifiche contemporanee: una passa, una rifiutata', esiti.filter((e) => !e).length === 1 && esiti.filter((e) => e?.statusCode === 409).length === 1, esiti)

// 4. riferimenti come Sanity
const rotto = await errore(() => db.create({ _type: 'collaudo', giocatore: { _type: 'reference', _ref: 'non-esiste' } }))
verifica('riferimento a documento inesistente rifiutato', rotto?.statusCode === 409, rotto)
const debole = await db.create({ _type: 'collaudo', giocatore: { _type: 'reference', _ref: 'non-esiste', _weak: true } })
verifica('riferimento debole accettato', !!debole._id && !!debole._createdAt)
const cancellaUsato = await errore(() => db.delete(giocatore))
verifica('non si cancella un giocatore ancora in una partita', cancellaUsato?.statusCode === 409, cancellaUsato)
verifica('il giocatore è ancora lì', (await db.fetch(`count(*[_id == $id])`, { id: giocatore })) === 1)

// 5. transazione: tutto o niente
const prima = await db.fetch<number>(`count(*[_type == "collaudo"])`)
const tx = await errore(() => db.transaction().create({ _type: 'collaudo', n: 1 }).delete(giocatore).commit())
verifica('transazione fallita non lascia niente a metà', tx?.statusCode === 409 && (await db.fetch(`count(*[_type == "collaudo"])`)) === prima)
const ok2 = await db.transaction().create({ _id: 'collaudo-x', _type: 'collaudo', n: 2 }).patch('collaudo-x', (p) => p.set({ n: 3 })).commit()
verifica('transazione con creazione e modifica', ok2.results.length === 2 && (await db.fetch(`*[_id == "collaudo-x"][0].n`)) === 3)
const esiste = await db.createIfNotExists({ _id: 'collaudo-x', _type: 'collaudo', n: 9 })
verifica('createIfNotExists non sovrascrive', esiste.n === 3)
await db.transaction().delete('collaudo-x').delete(debole._id).commit()
verifica('cancellazione', (await db.fetch(`count(*[_type == "collaudo"])`)) === 0)

// 6. foto: caricamento, file privato, link firmato
const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#16a34a' } }).png().toBuffer()
const asset = await db.assets.upload('image', png, { filename: 'collaudo.png', contentType: 'image/png' })
verifica('foto: identificativo come Sanity', /^image-[a-f0-9]{40}-40x30-png$/.test(asset._id), asset._id)
verifica('foto: file nell’archivio', (await leggiFile(asset._id))?.dati.length === png.length)
const link = new URL(linkFoto(asset._id, 100, true), 'http://x')
const q = link.searchParams
verifica('foto: link firmato valido', linkValido(asset._id, Number(q.get('w')), q.get('c') === '1', Number(q.get('e')), q.get('s')!))
verifica('foto: link manomesso rifiutato', !linkValido(asset._id, Number(q.get('w')), false, Number(q.get('e')), q.get('s')!))
const pubblico = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/foto/${asset._id}`)
verifica('foto: non visibile senza permesso', pubblico.status >= 400, pubblico.status)
await db.delete(asset._id)
verifica('foto: cancellata anche dall’archivio', (await leggiFile(asset._id)) === null)

console.log(`\n${ok} riusciti, ${ko} falliti`)
await sql().end()
