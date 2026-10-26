'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { creaT, type Lingua, type T } from '@/lib/i18n'

const Contesto = createContext<T>(creaT('it'))

// La lingua dell'app per i componenti nel browser (la decide il server dal cookie).
export function LinguaProvider({ lingua, children }: { lingua: Lingua; children: ReactNode }) {
  const t = useMemo(() => creaT(lingua), [lingua])
  useEffect(() => {
    document.documentElement.lang = lingua
  }, [lingua])
  return <Contesto.Provider value={t}>{children}</Contesto.Provider>
}

export const useT = () => useContext(Contesto)
