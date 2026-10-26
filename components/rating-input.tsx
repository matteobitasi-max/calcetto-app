'use client'

import { useState } from 'react'

export function RatingInput({ name, label, hint, defaultValue }: { name: string; label: string; hint?: string; defaultValue: number }) {
  const [value, setValue] = useState(defaultValue)
  return (
    <label className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-sm">
      <span title={hint}>
        {label}
        {hint && <span className="block text-xs leading-tight text-zinc-500">{hint}</span>}
      </span>
      <input
        type="range"
        name={name}
        min={1}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="accent-green-600"
      />
      <span className="text-right font-medium tabular-nums">{value.toLocaleString('it-IT')}</span>
    </label>
  )
}
