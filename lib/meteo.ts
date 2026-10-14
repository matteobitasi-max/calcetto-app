import 'server-only'
import { cacheLife } from 'next/cache'

// Meteo con Open-Meteo (gratuito, senza chiave): città della lega → coordinate,
// e previsione oraria (fino a 16 giorni) per l'ora della partita.

export type Citta = { nome: string; lat: number; lon: number }

export async function cercaCitta(nome: string): Promise<Citta | null> {
  const q = new URLSearchParams({ name: nome, count: '1', language: 'it' })
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${q}`)
  if (!r.ok) return null
  const t = (await r.json()) as { results?: { name: string; latitude: number; longitude: number; admin1?: string; country_code?: string }[] }
  const c = t.results?.[0]
  if (!c) return null
  const zona = c.country_code === 'IT' ? c.admin1 : c.country_code
  return { nome: zona ? `${c.name} (${zona})` : c.name, lat: c.latitude, lon: c.longitude }
}

export type Previsione = { simbolo: string; descrizione: string; temperatura: number; pioggia?: number }

// Codici meteo WMO → simbolo e descrizione.
function simbolo(codice: number): [string, string] {
  if (codice === 0) return ['☀️', 'Sereno']
  if (codice <= 2) return ['🌤️', 'Poco nuvoloso']
  if (codice === 3) return ['☁️', 'Nuvoloso']
  if (codice <= 48) return ['🌫️', 'Nebbia']
  if (codice <= 57) return ['🌦️', 'Pioviggine']
  if (codice <= 67) return ['🌧️', 'Pioggia']
  if (codice <= 77) return ['❄️', 'Neve']
  if (codice <= 82) return ['🌧️', 'Rovesci']
  if (codice <= 86) return ['🌨️', 'Rovesci di neve']
  return ['⛈️', 'Temporale']
}

// Previsione per l'ora della partita (in ora italiana). null se troppo lontana o già passata.
export async function previsione(lat: number, lon: number, dataISO: string): Promise<Previsione | null> {
  'use cache'
  cacheLife('hours')

  const quando = new Date(dataISO)
  const giorni = (quando.getTime() - Date.now()) / 86_400_000
  if (giorni < -0.1 || giorni > 15.5) return null
  // giorno e ora della partita in Italia, es. 2026-10-21 e 21
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(quando)
      .map((p) => [p.type, p.value]),
  )
  const giorno = `${parti.year}-${parti.month}-${parti.day}`
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    timezone: 'Europe/Rome',
    start_date: giorno,
    end_date: giorno,
  })
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`).catch(() => null)
  if (!r?.ok) return null
  const t = (await r.json()) as { hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: (number | null)[] } }
  const i = t.hourly?.time.indexOf(`${giorno}T${parti.hour}:00`) ?? -1
  if (!t.hourly || i < 0 || t.hourly.temperature_2m[i] == null) return null
  const [s, descrizione] = simbolo(t.hourly.weather_code[i])
  return { simbolo: s, descrizione, temperatura: Math.round(t.hourly.temperature_2m[i]), pioggia: t.hourly.precipitation_probability[i] ?? undefined }
}
