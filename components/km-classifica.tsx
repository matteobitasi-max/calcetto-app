import Link from "next/link";
import { displayName, type Player } from "@/lib/player";
import { Avatar, Card } from "@/components/ui";
import type { T } from "@/lib/i18n";

// Km corsi nelle partite (presi da Strava / Apple Salute / Health Connect), funzione Pro: podio e classifica
// per media a partita (km totali diviso le partite con i km: conta quanto corri, non quante volte giochi),
// con il record di una partita e i km di tutta la lega.
type Km = Map<string, { km: number; partite: number }>;

const righeKm = (km: Km, giocatori: Map<string, Player>) =>
  [...km.entries()]
    .filter(([id]) => giocatori.has(id))
    .map(([id, k]) => ({
      id,
      player: giocatori.get(id)!,
      media: k.km / k.partite,
      ...k,
    }))
    .sort((a, b) => b.media - a.media || b.partite - a.partite);

export function KmPercorsi({
  km,
  record,
  giocatori,
  mioId,
  t,
}: {
  km: Km;
  record: {
    record: { id: string; km: number; data: string } | null;
    totale: number;
  };
  giocatori: Map<string, Player>;
  mioId: string;
  t: T;
}) {
  const righe = righeKm(km, giocatori);
  if (righe.length === 0) return null;
  const fmt = (n: number) => t.numero(n, { maximumFractionDigits: 1 });
  const recordista = record.record && giocatori.get(record.record.id);
  return (
    <Card className="space-y-4 overflow-hidden">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">🏃 {t("Chi corre di più")}</h2>
        <span className="text-xs text-zinc-500">{t("km a partita")}</span>
      </div>
      <Podio
        righe={righe.slice(0, 3)}
        mioId={mioId}
        valore={(r) => fmt(r.media)}
      />
      {righe.length > 3 && (
        <ol className="space-y-2" start={4}>
          {righe.slice(3, 10).map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-lg px-1 py-1 ${r.id === mioId ? "bg-green-50 dark:bg-green-950" : ""}`}
            >
              <span className="w-5 text-right text-sm tabular-nums text-zinc-400">
                {i + 4}
              </span>
              <Avatar player={r.player} size={32} />
              <Link
                href={`/giocatori/${r.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <span
                  className={`block truncate text-sm ${r.id === mioId ? "font-extrabold" : "font-medium"}`}
                >
                  {displayName(r.player)}
                </span>
                <span className="block text-xs text-zinc-500">
                  {t("{km} km in totale", { km: fmt(r.km) })} ·{" "}
                  {t.n(r.partite, "{n} partita", "{n} partite")}
                </span>
              </Link>
              <span className="text-lg font-bold tabular-nums">
                {fmt(r.media)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="grid grid-cols-2 gap-2">
        {recordista && record.record && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-zinc-900">
            <p className="text-[11px] font-bold uppercase tracking-wide">
              🔥 {t("Record in una partita")}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">
              {fmt(record.record.km)} km
            </p>
            <p className="truncate text-xs font-medium">
              {displayName(recordista)} ·{" "}
              {t.data(record.record.data, { day: "numeric", month: "short" })}
            </p>
          </div>
        )}
        <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-800 p-3 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wide text-green-100">
            🌍 {t("Tutta la lega")}
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {fmt(record.totale)} km
          </p>
          <p className="text-xs text-green-100">
            {t("corsi insieme in partita")}
          </p>
        </div>
      </div>
    </Card>
  );
}

// I primi tre sul podio: il primo al centro e più in alto.
export function Podio<R extends { id: string; player: Player }>({
  righe,
  mioId,
  valore,
}: {
  righe: R[];
  mioId: string;
  valore: (r: R) => string;
}) {
  const posti = [
    {
      r: righe[1],
      medaglia: "🥈",
      altezza: "h-14",
      colore: "from-zinc-300 to-zinc-400",
    },
    {
      r: righe[0],
      medaglia: "🥇",
      altezza: "h-20",
      colore: "from-amber-300 to-amber-500",
    },
    {
      r: righe[2],
      medaglia: "🥉",
      altezza: "h-10",
      colore: "from-orange-300 to-orange-500",
    },
  ];
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {posti.map(({ r, medaglia, altezza, colore }, i) =>
        r ? (
          <Link
            key={r.id}
            href={`/giocatori/${r.id}`}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="text-xl">{medaglia}</span>
            <Avatar player={r.player} size={i === 1 ? 56 : 44} zoom={false} />
            <span
              className={`w-full truncate text-xs ${r.id === mioId ? "font-extrabold" : "font-semibold"}`}
            >
              {displayName(r.player)}
            </span>
            <span className="text-sm font-extrabold tabular-nums">
              {valore(r)}
            </span>
            <span
              className={`w-full rounded-t-xl bg-gradient-to-b ${colore} ${altezza}`}
              aria-hidden
            />
          </Link>
        ) : (
          <span key={i} />
        ),
      )}
    </div>
  );
}

// Senza Pro: si vede che la classifica dei km c'è (podio sfocato), e chi può attivarla.
export function KmBloccati({
  km,
  giocatori,
  admin,
  t,
}: {
  km: Km;
  giocatori: Map<string, Player>;
  admin: boolean;
  t: T;
}) {
  const righe = righeKm(km, giocatori);
  if (righe.length === 0) return null;
  return (
    <Card className="overflow-hidden">
      <h2 className="mb-3 font-semibold">🏃 {t("Chi corre di più")}</h2>
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm" aria-hidden>
          <Podio righe={righe.slice(0, 3)} mioId="" valore={() => "?,?"} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 p-4 text-center backdrop-blur-[1px] dark:bg-zinc-900/60">
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-zinc-900">
            PRO
          </span>
          <p className="text-sm font-semibold">
            {t(
              "La classifica dei km, il record e i km di tutta la lega sono funzioni Pro.",
            )}
          </p>
          {admin ? (
            <Link
              href="/pro"
              className="text-sm font-bold text-green-700 hover:underline dark:text-green-400"
            >
              {t("Scopri il Pro ›")}
            </Link>
          ) : (
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              {t("Chiedi all’organizzatore della lega di attivarlo.")}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
