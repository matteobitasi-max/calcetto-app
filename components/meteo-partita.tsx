import { previsione } from '@/lib/meteo'

// Meteo previsto all'ora della partita, nella città della lega (es. "☀️ 18° alle 21:00 · 💧 60%").
// Niente se la lega non ha la città o la partita è oltre i 16 giorni delle previsioni.
export async function MeteoPartita({ citta, data }: { citta?: { lat: number; lon: number }; data: string }) {
  if (!citta) return null
  const p = await previsione(citta.lat, citta.lon, data).catch(() => null)
  if (!p) return null
  const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date(data))
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-300" title={`${p.descrizione}, ${p.temperatura}° previsti alle ${ora}`}>
      <span className="text-base">{p.simbolo}</span> <b className="tabular-nums">{p.temperatura}°</b> alle {ora}
      <span className="text-zinc-500"> · {p.descrizione}</span>
      {p.pioggia != null && p.pioggia >= 30 && <span className="text-sky-700 dark:text-sky-400"> · 💧 {p.pioggia}%</span>}
    </p>
  )
}
