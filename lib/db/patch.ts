// Le modifiche ai documenti come le fa Sanity (set, setIfMissing, unset, append), applicate in memoria:
// servono all'archivio su Supabase (lib/db/supabase.ts), che salva i documenti uguali a quelli di Sanity.
// Percorsi supportati: `campo`, `campo.sotto`, `lista[_key == "x"]`, `lista[3]`, e combinazioni (`lista[_key == "x"].campo`).

export type Documento = { _id: string; _type: string; _rev?: string; _createdAt?: string; _updatedAt?: string; [k: string]: unknown }

export type Operazioni = {
  set?: Record<string, unknown>
  setIfMissing?: Record<string, unknown>
  unset?: string[]
  append?: { percorso: string; elementi: unknown[] }[]
}

type Passo = { campo: string; filtro?: { chiave: string } | { indice: number } }

// "a.b[_key == \"x\"].c" → [{campo: a}, {campo: b, filtro: {chiave: x}}, {campo: c}]
export function leggiPercorso(percorso: string): Passo[] {
  const passi: Passo[] = []
  const re = /([A-Za-z_][A-Za-z0-9_]*)(?:\[\s*(?:_key\s*==\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(-?\d+))\s*\])?(?:\.|$)/y
  let i = 0
  while (i < percorso.length) {
    re.lastIndex = i
    const m = re.exec(percorso)
    if (!m) throw new Error(`Percorso non supportato: ${percorso}`)
    const [, campo, chiave, indice] = m
    passi.push({
      campo,
      ...(chiave !== undefined && { filtro: { chiave: chiave.startsWith('"') ? JSON.parse(chiave) : chiave.slice(1, -1) } }),
      ...(indice !== undefined && { filtro: { indice: Number(indice) } }),
    })
    i = re.lastIndex
  }
  return passi
}

const oggetto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

// Gli oggetti che corrispondono a un passo con filtro dentro una lista.
function elementi(lista: unknown, filtro: NonNullable<Passo['filtro']>): Record<string, unknown>[] {
  if (!Array.isArray(lista)) return []
  if ('indice' in filtro) {
    const el = lista.at(filtro.indice)
    return oggetto(el) ? [el] : []
  }
  return lista.filter((el): el is Record<string, unknown> => oggetto(el) && el._key === filtro.chiave)
}

// I "contenitori" (oggetti) in cui sta l'ultimo campo del percorso. `crea`: crea gli oggetti mancanti (per set).
function contenitori(doc: Record<string, unknown>, passi: Passo[], crea: boolean): Record<string, unknown>[] {
  let attuali: Record<string, unknown>[] = [doc]
  for (const passo of passi) {
    const prossimi: Record<string, unknown>[] = []
    for (const c of attuali) {
      if (passo.filtro) prossimi.push(...elementi(c[passo.campo], passo.filtro))
      else {
        if (!oggetto(c[passo.campo])) {
          if (!crea || c[passo.campo] !== undefined) continue
          c[passo.campo] = {}
        }
        prossimi.push(c[passo.campo] as Record<string, unknown>)
      }
    }
    attuali = prossimi
  }
  return attuali
}

function imposta(doc: Record<string, unknown>, percorso: string, valore: unknown, soloSeManca: boolean) {
  const passi = leggiPercorso(percorso)
  const ultimo = passi[passi.length - 1]
  if (ultimo.filtro) {
    // set su un elemento di una lista: lo sostituisce
    // un elemento che c'è già non è "mancante": setIfMissing non fa niente
    if (soloSeManca) return
    const filtro = ultimo.filtro
    for (const c of contenitori(doc, passi.slice(0, -1), true)) {
      const lista = c[ultimo.campo]
      if (!Array.isArray(lista)) continue
      for (let i = 0; i < lista.length; i++) {
        const giusto = 'indice' in filtro ? i === (filtro.indice < 0 ? lista.length + filtro.indice : filtro.indice) : oggetto(lista[i]) && (lista[i] as Record<string, unknown>)._key === filtro.chiave
        if (giusto) lista[i] = clona(valore)
      }
    }
    return
  }
  for (const c of contenitori(doc, passi.slice(0, -1), true)) {
    if (soloSeManca && c[ultimo.campo] !== undefined) continue
    c[ultimo.campo] = clona(valore)
  }
}

function togli(doc: Record<string, unknown>, percorso: string) {
  const passi = leggiPercorso(percorso)
  const ultimo = passi[passi.length - 1]
  for (const c of contenitori(doc, passi.slice(0, -1), false)) {
    if (!ultimo.filtro) {
      delete c[ultimo.campo]
      continue
    }
    const lista = c[ultimo.campo]
    if (!Array.isArray(lista)) continue
    const via = new Set(elementi(lista, ultimo.filtro))
    c[ultimo.campo] = lista.filter((el) => !via.has(el as Record<string, unknown>))
  }
}

function aggiungi(doc: Record<string, unknown>, percorso: string, nuovi: unknown[]) {
  const passi = leggiPercorso(percorso)
  const ultimo = passi[passi.length - 1]
  if (ultimo.filtro) throw new Error(`append su un elemento non supportato: ${percorso}`)
  for (const c of contenitori(doc, passi.slice(0, -1), true)) {
    if (c[ultimo.campo] === undefined) c[ultimo.campo] = []
    if (!Array.isArray(c[ultimo.campo])) throw new Error(`append: ${percorso} non è una lista`)
    ;(c[ultimo.campo] as unknown[]).push(...nuovi.map(clona))
  }
}

const clona = <V>(v: V): V => (v === undefined ? v : structuredClone(v))

// Applica le operazioni nell'ordine di Sanity: set, setIfMissing, unset, poi gli inserimenti in lista.
export function applicaPatch<D extends Documento>(doc: D, op: Operazioni): D {
  const nuovo = structuredClone(doc) as Record<string, unknown>
  for (const [p, v] of Object.entries(op.set ?? {})) if (v !== undefined) imposta(nuovo, p, v, false)
  for (const [p, v] of Object.entries(op.setIfMissing ?? {})) if (v !== undefined) imposta(nuovo, p, v, true)
  for (const p of op.unset ?? []) togli(nuovo, p)
  for (const a of op.append ?? []) aggiungi(nuovo, a.percorso, a.elementi)
  for (const k of ['_id', '_type', '_rev', '_createdAt', '_updatedAt']) (nuovo as Documento)[k] = doc[k]
  return nuovo as D
}
