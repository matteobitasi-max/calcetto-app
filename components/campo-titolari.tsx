import { posti } from '@/lib/moduli'

export type Pedina = { id: string; nome: string; numero?: number; foto?: string | null }

// Altezza (in %) del portiere e delle linee: il portiere in basso, l'attacco in alto.
function altezza(linea: number, quante: number) {
  if (linea < 0) return 90
  return 72 - (linea * 54) / Math.max(quante - 1, 1)
}

// La formazione titolare di una squadra sul campo intero, nel modulo scelto. Componente "puro":
// lo usano sia la pagina della partita sia l'editor (che passa `onTocca` per scegliere chi mettere in un posto).
export function CampoTitolari({
  modulo,
  giocatori,
  mioId,
  attivo,
  onTocca,
}: {
  modulo: string
  /** un giocatore (o null, posto vuoto) per ogni posto: 0 è il portiere */
  giocatori: (Pedina | null)[]
  mioId?: string
  /** il posto selezionato nell'editor */
  attivo?: number | null
  onTocca?: (posto: number) => void
}) {
  const ps = posti(modulo)
  const quante = Math.max(...ps.map((p) => p.linea)) + 1
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[repeating-linear-gradient(to_bottom,#2f8f46_0_12.5%,#2a8340_12.5%_25%)] shadow-md ring-1 ring-black/10 dark:brightness-90">
      <svg viewBox="0 0 200 300" fill="none" stroke="white" strokeOpacity="0.65" strokeWidth="1.5" className="absolute inset-0 size-full" aria-hidden>
        <rect x="6" y="6" width="188" height="288" />
        <line x1="6" y1="150" x2="194" y2="150" />
        <circle cx="100" cy="150" r="28" />
        <circle cx="100" cy="150" r="2" fill="white" />
        <rect x="46" y="6" width="108" height="46" />
        <rect x="46" y="248" width="108" height="46" />
        <rect x="76" y="6" width="48" height="18" />
        <rect x="76" y="276" width="48" height="18" />
      </svg>
      <p className="absolute left-3 top-2.5 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-bold text-white">{modulo}</p>
      {ps.map((p) => {
        const g = giocatori[p.indice]
        const x = ((p.colonna + 1) * 100) / (p.perLinea + 1)
        const y = altezza(p.linea, quante)
        const contenuto = (
          <>
            <span
              className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold ${
                g ? 'border-white bg-white text-zinc-900' : 'border-dashed border-white/80 bg-black/20 text-white'
              } ${attivo === p.indice ? 'ring-3 ring-yellow-300' : ''}`}
            >
              {g?.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- foto del giocatore, già ridimensionata
                <img src={g.foto} alt="" className="h-full w-full object-cover" />
              ) : g ? (
                (g.numero ?? g.nome.slice(0, 1).toUpperCase())
              ) : (
                '+'
              )}
            </span>
            <span className={`max-w-full truncate rounded bg-black/55 px-1 text-[10px] leading-4 text-white ${g?.id === mioId ? 'font-extrabold' : 'font-medium'}`}>
              {/* con la foto nel cerchio il numero va accanto al nome; senza, è già nel cerchio */}
              {g ? `${g.foto && g.numero != null ? `${g.numero} ` : ''}${g.nome}` : '—'}
            </span>
          </>
        )
        const stile = { left: `${x}%`, top: `${y}%` }
        const classi = 'absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5'
        return onTocca ? (
          <button key={p.indice} type="button" onClick={() => onTocca(p.indice)} className={classi} style={stile}>
            {contenuto}
          </button>
        ) : (
          <div key={p.indice} className={classi} style={stile}>
            {contenuto}
          </div>
        )
      })}
    </div>
  )
}
