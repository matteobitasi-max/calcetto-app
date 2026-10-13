// Le sezioni del menu in alto e lo stile delle pillole (usati da server e client).
export const SEZIONI = [
  { href: '/', label: 'Partite', prefisso: '/partite' },
  { href: '/calendario', label: 'Calendario', prefisso: '/calendario' },
  { href: '/classifica', label: 'Classifica', prefisso: '/classifica' },
  { href: '/giocatori', label: 'Rosa', prefisso: '/giocatori' },
] as const

export const sezioneAttiva = (s: (typeof SEZIONI)[number], pathname: string) =>
  pathname === s.href || pathname.startsWith(s.prefisso)

// Un'unica pillola divisa in segmenti: il segmento della sezione attuale è verde.
export const barraClass = 'flex w-full rounded-full bg-zinc-100 p-1 dark:bg-zinc-800'

export const pillClass = (attiva: boolean) =>
  `flex-1 whitespace-nowrap rounded-full px-2 py-1.5 text-center text-sm font-medium transition ${
    attiva ? 'bg-green-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
  }`
