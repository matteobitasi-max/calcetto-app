import { previsione } from '@/lib/meteo'

// Meteo previsto all'ora della partita, nella città della lega (es. "☀️ 18° alle 21:00 · 💧 60%").
// Niente se la lega non ha la città o la partita è oltre i 16 giorni delle previsioni.
// `compatto`: solo simbolo e temperatura (+ pioggia), da mettere accanto all'orario.
export async function MeteoPartita({
  citta,
  data,
  compatto = false,
}: {
  citta?: { lat: number; lon: number }
  data: string
  compatto?: boolean
}) {
  if (!citta) return null
  const p = await previsione(citta.lat, citta.lon, data).catch(() => null)
  if (!p) return null
  const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date(data))
  if (compatto) {
    return (
      <span
        className="ml-2 inline-flex items-center gap-1 align-middle font-semibold"
        title={`${p.descrizione}, ${p.temperatura}° previsti alle ${ora}`}
      >
        <span className="text-2xl leading-none">{p.simbolo}</span>
        <span className="tabular-nums">{p.temperatura}°</span>
        {p.pioggia != null && p.pioggia >= 30 && <span className="text-sm font-medium text-sky-700 dark:text-sky-400">💧{p.pioggia}%</span>}
      </span>
    )
  }
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-300" title={`${p.descrizione}, ${p.temperatura}° previsti alle ${ora}`}>
      <span className="text-base">{p.simbolo}</span> <b className="tabular-nums">{p.temperatura}°</b> alle {ora}
      <span className="text-zinc-500"> · {p.descrizione}</span>
      {p.pioggia != null && p.pioggia >= 30 && <span className="text-sky-700 dark:text-sky-400"> · 💧 {p.pioggia}%</span>}
    </p>
  )
}
