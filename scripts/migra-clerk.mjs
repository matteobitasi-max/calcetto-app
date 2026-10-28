// Passaggio di Clerk dall'istanza di prova a quella di produzione (una volta sola).
//
//   node --env-file=.env.local scripts/migra-clerk.mjs            → mostra cosa farebbe
//   node --env-file=.env.local scripts/migra-clerk.mjs --esegui   → lo fa davvero
//
// In .env.local: CLERK_SECRET_KEY = chiave di prova (sk_test_…), CLERK_SECRET_KEY_PRODUZIONE = sk_live_…
// 1. Crea in produzione gli utenti di prova (stessa email, nome, dati privati; external_id = vecchio id).
//    Chi entra con Google o Apple con la stessa email ritrova il suo account; le password non si
//    possono copiare: si reimpostano con "Password dimenticata?".
// 2. In Sanity sostituisce i vecchi id con i nuovi (schede, iscrizioni alle notifiche, abbonamenti,
//    leghe e tornei creati).
// Si può rilanciare: chi esiste già in produzione (stessa email) non viene ricreato.

import { writeFileSync } from 'node:fs'

const esegui = process.argv.includes('--esegui')
const PROVA = process.env.CLERK_SECRET_KEY
const PRODUZIONE = process.env.CLERK_SECRET_KEY_PRODUZIONE
if (!PROVA?.startsWith('sk_test_')) throw new Error('CLERK_SECRET_KEY deve essere la chiave di prova (sk_test_…)')
if (!PRODUZIONE?.startsWith('sk_live_')) throw new Error('Manca CLERK_SECRET_KEY_PRODUZIONE (sk_live_…) in .env.local')

const clerk = async (chiave, percorso, opzioni = {}) => {
  const r = await fetch(`https://api.clerk.com/v1${percorso}`, {
    ...opzioni,
    headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
  })
  const corpo = await r.json()
  if (!r.ok) throw new Error(`Clerk ${percorso}: ${JSON.stringify(corpo.errors ?? corpo)}`)
  return corpo
}

const tutti = async (chiave) => {
  const lista = []
  for (let offset = 0; ; offset += 100) {
    const pagina = await clerk(chiave, `/users?limit=100&offset=${offset}&order_by=created_at`)
    lista.push(...pagina)
    if (pagina.length < 100) return lista
  }
}

const SANITY = `https://${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2025-02-19/data`
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET
const sanity = async (percorso, corpo) => {
  const r = await fetch(`${SANITY}${percorso}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.SANITY_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: corpo && JSON.stringify(corpo),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Sanity: ${JSON.stringify(j)}`)
  return j
}

// 1. Utenti
const vecchi = await tutti(PROVA)
const esistenti = new Map()
for (const u of await tutti(PRODUZIONE)) for (const e of u.email_addresses) esistenti.set(e.email_address.toLowerCase(), u.id)

const mappa = {}
for (const u of vecchi) {
  const email = (u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0])?.email_address
  if (!email) {
    console.log(`⚠️  ${u.id} senza email: saltato`)
    continue
  }
  const gia = esistenti.get(email.toLowerCase())
  if (gia) {
    mappa[u.id] = gia
    console.log(`=  ${email} esiste già (${gia})`)
    continue
  }
  if (!esegui) {
    mappa[u.id] = `(nuovo per ${email})`
    console.log(`+  ${email} da creare`)
    continue
  }
  const nuovo = await clerk(PRODUZIONE, '/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      first_name: u.first_name ?? undefined,
      last_name: u.last_name ?? undefined,
      external_id: u.id,
      public_metadata: u.public_metadata,
      private_metadata: u.private_metadata,
      unsafe_metadata: u.unsafe_metadata,
      skip_password_requirement: true,
      created_at: new Date(u.created_at).toISOString(),
    }),
  })
  mappa[u.id] = nuovo.id
  console.log(`+  ${email} creato (${nuovo.id})`)
}
writeFileSync(new URL('./migra-clerk-mappa.json', import.meta.url), JSON.stringify(mappa, null, 2))

// 2. Sanity: tutti i campi che contengono l'id di un utente
const CAMPI = ['clerkUserId', 'creataDa', 'creatoDa']
const filtro = CAMPI.map((c) => `${c} in $vecchi`).join(' || ')
const q = new URLSearchParams({ query: `*[${filtro}]{_id, _type, ${CAMPI.join(', ')}}`, $vecchi: JSON.stringify(Object.keys(mappa)) })
const { result: documenti } = await sanity(`/query/${DATASET}?${q}`)

const mutazioni = documenti.flatMap((d) => {
  const set = Object.fromEntries(CAMPI.filter((c) => mappa[d[c]]).map((c) => [c, mappa[d[c]]]))
  return Object.keys(set).length ? [{ patch: { id: d._id, set } }] : []
})
const perTipo = Object.groupBy(documenti, (d) => d._type)
console.log(`\nSanity: ${mutazioni.length} documenti da aggiornare`, Object.fromEntries(Object.entries(perTipo).map(([k, v]) => [k, v.length])))

if (esegui && mutazioni.length) {
  await sanity(`/mutate/${DATASET}`, { mutations: mutazioni })
  console.log('✅ Sanity aggiornato')
}
if (!esegui) console.log('\nProva soltanto: per farlo davvero aggiungi --esegui')
