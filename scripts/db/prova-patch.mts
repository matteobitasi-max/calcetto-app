// Applica le stesse modifiche su un documento di prova in Sanity e con lib/db/patch.ts, e confronta.
import { createClient } from '@sanity/client'
import { applicaPatch, type Documento, type Operazioni } from '../../lib/db/patch'

const P = process.env
const sanity = createClient({ projectId: P.NEXT_PUBLIC_SANITY_PROJECT_ID!, dataset: P.NEXT_PUBLIC_SANITY_DATASET!, apiVersion: '2025-10-01', token: P.SANITY_API_TOKEN, useCdn: false })
const ID = 'prova-adattatore-thecap'

const base = {
  _id: ID,
  _type: 'provaAdattatore',
  nome: 'Prova',
  notifiche: { partite: true },
  caratteristiche: { tiro: 5 },
  convocazioni: [
    { _key: 'a', risposta: 'presente', giocatore: { _type: 'reference', _ref: 'x', _weak: true } },
    { _key: 'b', risposta: 'assente' },
  ],
  distanze: [{ _key: 'p1', km: 3 }],
}

// [descrizione, operazioni]
const casi: [string, Operazioni][] = [
  ['set semplice + unset', { set: { nome: 'Nuovo', postiDisponibili: 16 }, unset: ['caratteristiche'] }],
  ['set annidato con setIfMissing', { setIfMissing: { notifiche: {} }, set: { 'notifiche.risultati': false } }],
  ['set annidato su oggetto mancante', { setIfMissing: { caratteristicheBase: { tiro: 4 } }, set: { 'nuovo.campo': 1 } }],
  ['unset elemento per _key', { setIfMissing: { distanze: [] }, unset: ['distanze[_key == "p1"]'] }],
  ['unset elemento mancante', { unset: ['distanze[_key == "zz"]', 'inesistente'] }],
  ['append dopo setIfMissing', { setIfMissing: { pagamenti: [] }, append: [{ percorso: 'pagamenti', elementi: [{ _key: 'q', pagato: true }] }] }],
  ['unset + append stesso elemento', { setIfMissing: { distanze: [] }, unset: ['distanze[_key == "p1"]'], append: [{ percorso: 'distanze', elementi: [{ _key: 'p1', km: 5 }] }] }],
  ['set dentro elemento di lista', { set: { 'convocazioni[_key == "b"].risposta': 'presente' } }],
  ['set e unset di campi diversi', { set: { 'caratteristiche.tiro': 7, 'caratteristiche.passaggio': 6 }, unset: ['notifiche'] }],
]

let ok = 0
for (const [nome, op] of casi) {
  await sanity.createOrReplace(base)
  let p = sanity.patch(ID)
  if (op.set) p = p.set(op.set)
  if (op.setIfMissing) p = p.setIfMissing(op.setIfMissing)
  if (op.unset) p = p.unset(op.unset)
  for (const a of op.append ?? []) p = p.append(a.percorso, a.elementi)
  const daSanity = (await p.commit()) as unknown as Documento
  const mio = applicaPatch({ ...(base as unknown as Documento), _rev: daSanity._rev, _createdAt: daSanity._createdAt, _updatedAt: daSanity._updatedAt }, op)
  const norm = (d: Documento) => JSON.stringify(d, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v))
  const uguale = norm(daSanity) === norm(mio)
  ok += Number(uguale)
  console.log(uguale ? 'UGUALE ' : 'DIVERSO', nome)
  if (!uguale) console.log('  sanity:', norm(daSanity), '\n  mio   :', norm(mio))
}
await sanity.delete(ID)
console.log(`${ok}/${casi.length}`, '— documento di prova cancellato:', (await sanity.getDocument(ID)) === undefined)
