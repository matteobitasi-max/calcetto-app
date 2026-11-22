import Link from 'next/link'
import { barraClass, pillClass } from './sezioni'

// Una pillola divisa in segmenti (come il menu in alto) per scegliere la vista di una pagina.
export function PillScelta({ voci }: { voci: { href: string; label: string; attiva: boolean }[] }) {
  return (
    <nav className={barraClass}>
      {voci.map((v) => (
        <Link key={v.href} href={v.href} replace scroll={false} className={pillClass(v.attiva)} aria-current={v.attiva ? 'page' : undefined}>
          {v.label}
        </Link>
      ))}
    </nav>
  )
}

// Etichetta e riquadro "bloccato": le funzioni del Club si vedono, ma senza Club non si possono usare.
export function EtichettaClub() {
  return <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">CLUB</span>
}
