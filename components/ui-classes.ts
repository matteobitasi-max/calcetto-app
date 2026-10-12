// Classi condivise, importabili anche dai Client Component.

export function buttonClass(variant: 'primary' | 'secondary' | 'danger' = 'primary') {
  const base = 'inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50'
  return {
    primary: `${base} bg-green-600 text-white hover:bg-green-700`,
    secondary: `${base} border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800`,
    danger: `${base} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950`,
  }[variant]
}

export const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950'
