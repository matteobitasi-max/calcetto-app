import type { ComponentProps, ReactNode } from 'react'

// Riquadri e campi dei moduli: senza dipendenze dal server, usabili anche nei componenti del browser.
export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-lg dark:shadow-black/40 ${className}`} {...props} />
}

// group: per controlli composti (es. il calendario) che non possono stare dentro un <label>.
export function Field({ label, children, group = false }: { label: string; children: ReactNode; group?: boolean }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </Tag>
  )
}
