import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { parse } from 'groq-js'
import { evaluate } from '../vendor/groq-js'
import { applicaPatch, type Documento, type Operazioni } from './patch'
import { cancellaFile, caricaFoto } from './foto'

// Archivio dei dati su Supabase (Postgres) con la stessa interfaccia del client di Sanity usata dall'app:
// i documenti sono salvati uguali a quelli di Sanity (una riga per documento, tabella `documenti`),
// le interrogazioni sono in GROQ (eseguite da groq-js, il motore di Sanity) e le modifiche
// (set, unset, setIfMissing, append, ifRevisionId) danno gli stessi documenti di Sanity (lib/db/patch.ts).
// Come Sanity, rifiuta i riferimenti a documenti che non esistono (salvo `_weak`).

let connessione: ReturnType<typeof postgres> | null = null

export function sql() {
  if (connessione) return connessione
  const url = process.env.SUPABASE_DB_URL
  if (!url) throw new Error('SUPABASE_DB_URL mancante')
  const conPassword = url.replace('[YOUR-PASSWORD]', encodeURIComponent(process.env.SUPABASE_DB_PASSWORD ?? ''))
  // modalità "transaction" del pooler (porta 6543): adatta alle funzioni serverless di Vercel
  connessione = postgres(conPassword.replace(/:5432\//, ':6543/'), {
    ssl: 'require',
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return connessione
}

// ---------- Letture ----------

// Tutti i documenti, tenuti in memoria finché non cambia il numero di versione (lo aumenta il database a ogni scrittura):
// ogni lettura costa una sola richiesta al database, e i dati si scaricano di nuovo solo se qualcosa è cambiato.
let cache: { versione: string; docs: Documento[] } | null = null

async function tuttiIDocumenti(): Promise<Documento[]> {
  const [riga] = await sql()<{ versione: string; docs: Documento[] | null }[]>`
    select v.n::text as versione,
      case when v.n::text = ${cache?.versione ?? ''} then null
        else (select coalesce(jsonb_agg(d.doc order by d.id), '[]'::jsonb) from documenti d) end as docs
    from versione v where v.id = 1`
  if (riga.docs) cache = { versione: riga.versione, docs: riga.docs }
  return cache!.docs
}

// Una lettura dal database rende la pagina dinamica (come le richieste a Sanity): non va mai nella parte statica.
async function dinamico() {
  try {
    const { connection } = await import('next/server')
    await connection()
  } catch {
    // fuori da una richiesta (script, after()) o in una funzione in cache: va bene così
  }
}

async function fetchGroq<R = unknown>(query: string, params: Record<string, unknown> = {}): Promise<R> {
  await dinamico()
  const dataset = await tuttiIDocumenti()
  const albero = parse(query, { params })
  const risultato = await evaluate(albero, { dataset, params })
  return (await risultato.get()) as R
}

// ---------- Scritture ----------

type Mutazione =
  | { create: Partial<Documento> & { _type: string } }
  | { createOrReplace: Documento }
  | { createIfNotExists: Documento }
  | { delete: { id: string } }
  | { patch: { id: string; ifRevisionID?: string; op: Operazioni } }

export class ErroreArchivio extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
  }
}

const nuovoId = () => randomBytes(16).toString('base64url').replace(/[-_]/g, '').slice(0, 22)
const nuovaRevisione = () => randomBytes(16).toString('base64url').replace(/[-_]/g, '').slice(0, 22)

// I riferimenti "forti" di un documento (quelli che devono esistere): tutti i `_ref` senza `_weak`.
function riferimenti(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) for (const x of v) riferimenti(x, out)
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o._ref === 'string' && o._weak !== true) out.add(o._ref)
    for (const x of Object.values(o)) riferimenti(x, out)
  }
  return out
}

async function applica(mutazioni: Mutazione[]) {
  const fotoCancellate: string[] = []
  const esito = await sql().begin(async (tx) => {
    // una scrittura alla volta: niente modifiche contemporanee che si sovrascrivono
    await tx`lock table documenti in share row exclusive mode`
    const righe = await tx<{ doc: Documento }[]>`select doc from documenti`
    const tutti = new Map(righe.map((r) => [r.doc._id, r.doc]))
    const toccati = new Map<string, Documento | null>()
    const ora = new Date().toISOString()
    const rev = nuovaRevisione()
    const risultati: { id: string; operation: string; documento?: Documento }[] = []

    const salva = (d: Documento, operation: string) => {
      tutti.set(d._id, d)
      toccati.set(d._id, d)
      risultati.push({ id: d._id, operation, documento: d })
    }

    for (const m of mutazioni) {
      if ('create' in m) {
        const id = m.create._id ?? nuovoId()
        if (tutti.has(id)) throw new ErroreArchivio(`Document by ID "${id}" already exists`, 409)
        salva({ ...m.create, _id: id, _createdAt: ora, _updatedAt: ora, _rev: rev } as Documento, 'create')
      } else if ('createOrReplace' in m) {
        const prima = tutti.get(m.createOrReplace._id)
        salva({ ...m.createOrReplace, _createdAt: prima?._createdAt ?? ora, _updatedAt: ora, _rev: rev }, prima ? 'update' : 'create')
      } else if ('createIfNotExists' in m) {
        const prima = tutti.get(m.createIfNotExists._id)
        if (prima) risultati.push({ id: prima._id, operation: 'none', documento: prima })
        else salva({ ...m.createIfNotExists, _createdAt: ora, _updatedAt: ora, _rev: rev }, 'create')
      } else if ('delete' in m) {
        if (tutti.delete(m.delete.id)) toccati.set(m.delete.id, null)
        risultati.push({ id: m.delete.id, operation: 'delete' })
      } else {
        const { id, ifRevisionID, op } = m.patch
        const doc = tutti.get(id)
        if (!doc) throw new ErroreArchivio(`Document "${id}" not found`, 404)
        if (ifRevisionID && doc._rev !== ifRevisionID) {
          throw new ErroreArchivio(`Document "${id}" has unexpected revision ID ("${doc._rev}"), expected "${ifRevisionID}"`, 409)
        }
        salva({ ...applicaPatch(doc, op), _updatedAt: ora, _rev: rev }, 'update')
      }
    }

    // riferimenti: quelli dei documenti scritti devono esistere, e nessuno può puntare a uno cancellato
    for (const [id, doc] of toccati) {
      if (!doc) continue
      for (const ref of riferimenti(doc)) {
        if (!tutti.has(ref)) throw new ErroreArchivio(`Document "${id}" references non-existent document "${ref}"`, 409)
      }
    }
    const cancellati = [...toccati].filter(([, d]) => !d).map(([id]) => id)
    if (cancellati.length) {
      for (const doc of tutti.values()) {
        const refs = riferimenti(doc)
        const rotto = cancellati.find((id) => refs.has(id))
        if (rotto) throw new ErroreArchivio(`Document "${rotto}" cannot be deleted as there are references to it from "${doc._id}"`, 409)
      }
    }

    for (const [id, doc] of toccati) {
      if (!doc) {
        await tx`delete from documenti where id = ${id}`
        if (id.startsWith('image-')) fotoCancellate.push(id)
      }
      else
        await tx`insert into documenti (id, tipo, doc, creato, aggiornato)
          values (${id}, ${doc._type}, ${tx.json(doc as never)}, ${doc._createdAt ?? ora}, ${ora})
          on conflict (id) do update set tipo = excluded.tipo, doc = excluded.doc, aggiornato = excluded.aggiornato`
    }
    return { transactionId: rev, results: risultati, documentIds: risultati.map((r) => r.id) }
  })
  // la foto sparisce davvero anche dall'archivio dei file (dopo che la cancellazione è andata a buon fine)
  for (const id of fotoCancellate) await cancellaFile(id).catch(() => undefined)
  return esito
}

// ---------- Interfaccia uguale a quella del client di Sanity ----------

export class Patch {
  private op: Required<Pick<Operazioni, 'set' | 'setIfMissing' | 'unset' | 'append'>> = { set: {}, setIfMissing: {}, unset: [], append: [] }
  private revisione?: string

  constructor(
    readonly id: string,
    private esegui?: (m: Mutazione[]) => ReturnType<typeof applica>,
  ) {}

  set(valori: Record<string, unknown>) {
    Object.assign(this.op.set, valori)
    return this
  }
  setIfMissing(valori: Record<string, unknown>) {
    Object.assign(this.op.setIfMissing, valori)
    return this
  }
  unset(percorsi: string[]) {
    this.op.unset.push(...percorsi)
    return this
  }
  append(percorso: string, elementi: unknown[]) {
    this.op.append.push({ percorso, elementi })
    return this
  }
  ifRevisionId(rev: string) {
    this.revisione = rev
    return this
  }
  mutazione(): Mutazione {
    return { patch: { id: this.id, ifRevisionID: this.revisione, op: this.op } }
  }
  async commit() {
    if (!this.esegui) throw new Error('Patch senza archivio')
    const r = await this.esegui([this.mutazione()])
    return r.results[0].documento
  }
}

export class Transazione {
  private mutazioni: Mutazione[] = []

  patch(idOPatch: string | Patch, modifica?: (p: Patch) => Patch) {
    const p = typeof idOPatch === 'string' ? new Patch(idOPatch) : idOPatch
    this.mutazioni.push((modifica ? modifica(p) : p).mutazione())
    return this
  }
  create(doc: Partial<Documento> & { _type: string }) {
    this.mutazioni.push({ create: doc })
    return this
  }
  createOrReplace(doc: Documento) {
    this.mutazioni.push({ createOrReplace: doc })
    return this
  }
  createIfNotExists(doc: Documento) {
    this.mutazioni.push({ createIfNotExists: doc })
    return this
  }
  delete(id: string) {
    this.mutazioni.push({ delete: { id } })
    return this
  }
  async commit() {
    if (this.mutazioni.length === 0) return { transactionId: '', results: [], documentIds: [] }
    const r = await applica(this.mutazioni)
    return { transactionId: r.transactionId, results: r.results.map(({ id, operation }) => ({ id, operation })), documentIds: r.documentIds }
  }
}

const primo = async (m: Mutazione) => (await applica([m])).results[0].documento!

export const archivioSupabase = {
  fetch: fetchGroq,
  patch: (id: string) => new Patch(id, applica),
  transaction: () => new Transazione(),
  create: (doc: Partial<Documento> & { _type: string }) => primo({ create: doc }),
  createOrReplace: (doc: Documento) => primo({ createOrReplace: doc }),
  createIfNotExists: (doc: Documento) => primo({ createIfNotExists: doc }),
  delete: async (id: string) => {
    const r = await applica([{ delete: { id } }])
    return { transactionId: r.transactionId, results: r.results }
  },
  assets: {
    // come sanity.assets.upload('image', ...): salva il file nell'archivio privato e crea il documento dell'immagine
    upload: async (_tipo: 'image', dati: Buffer, opzioni: { filename?: string; contentType?: string } = {}) => {
      const asset = await caricaFoto(dati, opzioni)
      return (await applica([{ createIfNotExists: asset }])).results[0].documento!
    },
  },
}

// Per gli script: hash di un file come quello di Sanity (sha1).
export const sha1 = (dati: Buffer) => createHash('sha1').update(dati).digest('hex')
