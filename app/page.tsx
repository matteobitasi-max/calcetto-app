import { UserButton } from "@clerk/nextjs";
import { getCurrentPlayer } from "@/lib/player";

const LABELS = {
  attacco: "Attacco",
  difesa: "Difesa",
  tecnica: "Tecnica",
  velocita: "Velocità",
  resistenza: "Resistenza",
  porta: "In porta",
} as const;

export default async function Home() {
  const player = await getCurrentPlayer();

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calcetto ⚽</h1>
        <UserButton />
      </header>

      {!player ? (
        <p className="rounded-lg border p-4">
          Non sei ancora nella rosa. Chiedi all&apos;organizzatore di aggiungerti
          con l&apos;email con cui hai fatto l&apos;accesso.
        </p>
      ) : (
        <section className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold">
            {player.nome} {player.cognome}
            {player.soprannome && <span className="text-zinc-500"> “{player.soprannome}”</span>}
          </h2>
          <p className="mb-4 text-sm capitalize text-zinc-500">
            {[player.ruolo, player.piede && `piede ${player.piede}`].filter(Boolean).join(" · ")}
          </p>
          <ul className="space-y-2">
            {Object.entries(LABELS).map(([key, label]) => {
              const value = player.caratteristiche?.[key as keyof typeof LABELS] ?? 0;
              return (
                <li key={key} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 text-sm">
                  <span>{label}</span>
                  <span className="h-2 rounded bg-zinc-200 dark:bg-zinc-800">
                    <span className="block h-2 rounded bg-green-600" style={{ width: `${value * 10}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{value}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
