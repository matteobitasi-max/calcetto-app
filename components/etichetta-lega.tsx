// Di quale lega è una partita, a colpo d'occhio: logo (o iniziale), nome e, per le squadre del Club,
// l'etichetta "Club". Per chi è in più leghe (es. la squadra che allena e la lega con gli amici).
export function EtichettaLega({ nome, logo, club }: { nome: string; logo?: string | null; club?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 align-middle">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
          {nome.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <b className="truncate font-semibold">{nome}</b>
      {club && <span className="shrink-0 rounded bg-blue-600 px-1 text-[9px] font-bold uppercase leading-4 text-white">Club</span>}
    </span>
  )
}
