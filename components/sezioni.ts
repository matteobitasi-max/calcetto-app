// Le sezioni del menu in alto e lo stile delle pillole (usati da server e client).
export const SEZIONI = [
  { href: '/', label: 'Partite', prefisso: '/partite' },
  { href: '/calendario', label: 'Calendario', prefisso: '/calendario' },
  { href: '/classifica', label: 'Classifica', prefisso: '/classifica' },
  { href: '/giocatori', label: 'Rosa', prefisso: '/giocatori' },
] as const

export const sezioneAttiva = (s: (typeof SEZIONI)[number], pathname: string) =>
  pathname === s.href || pathname.startsWith(s.prefisso)

export const pillClass = (attiva: boolean) =>
  `shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
    attiva
      ? 'bg-green-600 text-white shadow-sm'
      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
  }`
