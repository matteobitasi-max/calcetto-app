import Link from 'next/link'
import type { Player } from '@/lib/roster'
import { schiera } from '@/lib/schieramento'
import { Avatar } from './ui'

const ALTEZZE_LINEE = [93, 80, 68, 56]

// Sulle pedine c'è poco spazio: nome e prima lettera del cognome.
const nomeCorto = (p: Player) => (p.cognome ? `${p.nome} ${p.cognome[0].toUpperCase()}.` : p.nome)

// Le due squadre schierate sullo stesso campo: A nella metà in basso, B in quella in alto.
// Il cerchio colorato intorno alla foto ce l'ha solo la squadra con le pettorine.
export function CampoFormazioni({
  seme,
  squadre,
  nomi,
  pettorine,
  mioId,
}: {
  seme: string
  squadre: { A: Player[]; B: Player[] }
  nomi: { A: string; B: string }
  pettorine?: 'A' | 'B'
  mioId?: string
}) {
  const a = schiera(squadre.A, `${seme}A`)
  const b = schiera(squadre.B, `${seme}B`)
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
      <Etichetta nome={nomi.B} modulo={b.modulo} className="top-2.5" />
      <Etichetta nome={nomi.A} modulo={a.modulo} className="bottom-2.5" />
      {[a, b].map((s, squadra) =>
        [s.portiere ? [s.portiere] : [], ...s.linee].filter((l) => l.length).map((linea, i, righe) => {
          // le linee occupano la metà campo; se sono poche restano comunque distribuite
          const altezza = righe.length === 4 ? ALTEZZE_LINEE[i] : 93 - (i * 37) / Math.max(righe.length - 1, 1)
          return linea.map((p, j) => (
            <Pedina
              key={p._id}
              player={p}
              mio={p._id === mioId}
              pettorina={pettorine === (squadra ? 'B' : 'A')}
              x={((j + 1) * 100) / (linea.length + 1)}
              y={squadra ? 100 - altezza : altezza}
            />
          ))
        }),
      )}
    </div>
  )
}

function Etichetta({ nome, modulo, className }: { nome: string; modulo: string; className: string }) {
  return (
    <p className={`absolute left-3 max-w-[32%] truncate rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white ${className}`}>
      {nome}
      {modulo && <span className="font-normal opacity-80"> · {modulo}</span>}
    </p>
  )
}

function Pedina({ player, mio, pettorina, x, y }: { player: Player; mio: boolean; pettorina: boolean; x: number; y: number }) {
  return (
    <Link
      href={`/giocatori/${player._id}`}
      className="absolute flex w-[23%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className={`rounded-full ${pettorina ? 'ring-3 ring-yellow-300' : ''}`}>
        <Avatar player={player} size={36} zoom={false} />
      </span>
      <span className={`max-w-full truncate rounded bg-black/55 px-1 text-[10px] leading-4 text-white ${mio ? 'font-extrabold' : 'font-medium'}`}>{nomeCorto(player)}</span>
    </Link>
  )
}
