'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { inputClass } from './ui-classes'

const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const ORE_RAPIDE = ['18:00', '19:00', '20:00', '20:30', '21:00', '21:30']

const pad = (n: number) => String(n).padStart(2, '0')
const parts = (day: string) => day.split('-').map(Number) as [number, number, number]

// Date di calendario trattate in UTC: nessun problema di fuso orario nel browser.
function label(day: string, time?: string) {
  const [y, m, d] = parts(day)
  const data = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    Date.UTC(y, m - 1, d),
  )
  return time ? `${data}, ${time}` : data
}

function oggi() {
  const n = new Date()
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
}

/**
 * Campo data (o data e ora) con mini calendario. Invia lo stesso formato dei campi
 * nativi: "AAAA-MM-GG" oppure "AAAA-MM-GGTHH:MM".
 */
export function DatePicker({
  name,
  defaultValue,
  withTime = false,
  required = false,
  min,
  placeholder = 'Scegli una data',
  onChange,
}: {
  name: string
  defaultValue?: string
  withTime?: boolean
  required?: boolean
  /** Giorno minimo selezionabile (AAAA-MM-GG). */
  min?: string
  placeholder?: string
  onChange?: (value: string) => void
}) {
  const [day, setDay] = useState(defaultValue?.slice(0, 10) ?? '')
  const [time, setTime] = useState(defaultValue?.slice(11, 16) || '20:30')
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => (defaultValue?.slice(0, 7) || oggi().slice(0, 7)).split('-').map(Number))
  const box = useRef<HTMLDivElement>(null)
  const id = useId()

  const value = day ? (withTime ? `${day}T${time}` : day) : ''

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  function update(nextDay: string, nextTime: string) {
    setDay(nextDay)
    setTime(nextTime)
    onChange?.(withTime ? `${nextDay}T${nextTime}` : nextDay)
  }

  const [vy, vm] = view
  const giorniNelMese = new Date(Date.UTC(vy, vm, 0)).getUTCDate()
  const vuoti = (new Date(Date.UTC(vy, vm - 1, 1)).getUTCDay() + 6) % 7
  const titolo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(vy, vm - 1, 1))
  const today = oggi()
  const sposta = (delta: number) => setView(([y, m]) => (m + delta === 0 ? [y - 1, 12] : m + delta === 13 ? [y + 1, 1] : [y, m + delta]))

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between text-left ${day ? '' : 'text-zinc-400'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="capitalize">{day ? label(day, withTime ? time : undefined) : placeholder}</span>
        <span aria-hidden>📅</span>
      </button>
      {/* Campo reale inviato col form: invisibile ma valida "required" e mostra l'avviso nel punto giusto. */}
      <input
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
      />

      {open && (
        <div role="dialog" aria-labelledby={id} className="absolute z-20 mt-1 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => sposta(-1)} className="rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mese precedente">
              ‹
            </button>
            <span className="text-sm font-semibold capitalize">{titolo}</span>
            <button type="button" onClick={() => sposta(1)} className="rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mese successivo">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
            {GIORNI.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: vuoti }, (_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: giorniNelMese }, (_, i) => {
              const key = `${vy}-${pad(vm)}-${pad(i + 1)}`
              const disabled = !!min && key < min
              const selected = key === day
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    update(key, time)
                    if (!withTime) setOpen(false)
                  }}
                  className={`aspect-square rounded-lg text-sm tabular-nums ${
                    selected
                      ? 'bg-green-600 font-bold text-white'
                      : disabled
                        ? 'text-zinc-300 dark:text-zinc-700'
                        : 'hover:bg-green-50 dark:hover:bg-green-950'
                  } ${key === today && !selected ? 'ring-1 ring-green-600' : ''}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          {withTime && (
            <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Ora</span>
                <input
                  type="time"
                  step={300}
                  value={time}
                  onChange={(e) => e.target.value && update(day || today, e.target.value)}
                  className={`${inputClass} w-auto`}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {ORE_RAPIDE.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update(day || today, t)}
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      t === time ? 'border-green-600 bg-green-600 text-white' : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">
                Fatto
              </button>
            </div>
          )}

          {!required && day && (
            <button type="button" onClick={() => { setDay(''); onChange?.(''); setOpen(false) }} className="mt-2 w-full text-center text-xs text-zinc-500 hover:underline">
              Togli data
            </button>
          )}
        </div>
      )}
    </div>
  )
}
