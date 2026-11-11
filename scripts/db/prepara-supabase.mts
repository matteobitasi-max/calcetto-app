// Crea su Supabase le tabelle (supabase/schema.sql) e l'archivio privato delle foto. Si può rilanciare.
import { readFileSync } from 'node:fs'
import { sql } from '../../lib/db/supabase'
import { BUCKET } from '../../lib/db/foto'

await sql().unsafe(readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8'))
const tabelle = await sql()`select table_name from information_schema.tables where table_schema = 'public' order by 1`
console.log('tabelle:', tabelle.map((t) => t.table_name).join(', '))
const rls = await sql()`select relname, relrowsecurity from pg_class where relname in ('documenti', 'versione')`
console.log('protezione righe:', rls.map((r) => `${r.relname}=${r.relrowsecurity}`).join(', '))

const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY!
const h = { Authorization: `Bearer ${chiave}`, apikey: chiave, 'content-type': 'application/json' }
const esiste = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, { headers: h })
if (esiste.status !== 200) {
  const r = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, { method: 'POST', headers: h, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 10 * 1024 * 1024 }) })
  console.log('archivio foto creato:', r.status, await r.text())
}
const b = await (await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, { headers: h })).json()
console.log('archivio foto:', b.id, 'pubblico =', b.public)
await sql().end()
