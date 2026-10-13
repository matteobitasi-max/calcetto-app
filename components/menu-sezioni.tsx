'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SEZIONI, pillClass, sezioneAttiva } from './sezioni'

// Il menu delle sezioni a pillole: quella in cui ti trovi è evidenziata.
export function MenuSezioni() {
  const pathname = usePathname()
  return (
    <>
      {SEZIONI.map((s) => {
        const attiva = sezioneAttiva(s, pathname)
        return (
          <Link key={s.href} href={s.href} aria-current={attiva ? 'page' : undefined} className={pillClass(attiva)}>
            {s.label}
          </Link>
        )
      })}
    </>
  )
}
