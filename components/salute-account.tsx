'use client'

import { useEffect, useState } from 'react'
import { Salute, chiediConsensoKm, impostaKmAutomatici, kmAutomatici, nomeSalute, revocaConsensoKm, saluteDisponibile } from '@/lib/salute'
import { useT } from '@/components/lingua'

// Nel mio account (solo nell'app): km delle partite presi da soli da Apple Salute / Health Connect.
export function SaluteAccount() {
  const t = useT()
  const [disponibile, setDisponibile] = useState(false)
  const [attivi, setAttivi] = useState(false)
  const [pending, setPending] = useState(false)
  const [nome, setNome] = useState('Apple Health')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nell'app
    setDisponibile(saluteDisponibile())
    setAttivi(kmAutomatici())
    setNome(nomeSalute())
  }, [])

  if (!disponibile) return null

  const cambia = async () => {
    if (attivi) {
      impostaKmAutomatici(false)
      revocaConsensoKm()
      setAttivi(false)
      return
    }
    if (!chiediConsensoKm(t('Per i km delle partite, The Cap legge da {app} solo la distanza camminata e corsa registrata durante le tue partite. È un dato legato alla salute: lo usiamo solo per mostrare i tuoi km ai membri della lega e puoi disattivarlo quando vuoi in Il mio account. Acconsenti?', { app: nome }))) return
    setPending(true)
    try {
      // chiede il permesso di Salute (solo la prima volta compare la richiesta di Apple)
      await Salute.distanza({ inizio: Date.now() - 3600_000, fine: Date.now() })
      impostaKmAutomatici(true)
      setAttivi(true)
    } catch {
      setAttivi(false)
    } finally {
      setPending(false)
    }
  }

  const ios = nome === 'Apple Health'
  return (
    <div className="space-y-3 px-4 py-3 text-sm">
      {/* sempre visibile nell'app: cosa legge The Cap da Apple Health / Health Connect e perché */}
      <div>
        <p className="font-semibold">❤️ {ios ? t('Apple Health (Salute)') : 'Health Connect'}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {t(
            'The Cap legge da {app} solo la distanza camminata e corsa registrata durante l’orario delle tue partite, per mostrare i km che hai percorso. Non scrive nulla e non legge altri dati di salute.',
            { app: ios ? t('Apple Health (l’app Salute)') : 'Health Connect' },
          )}{' '}
          {ios
            ? t('Puoi cambiare il permesso quando vuoi da Impostazioni → Salute → Accesso ai dati e dispositivi → TheCap.')
            : t('Puoi cambiare il permesso quando vuoi dalle impostazioni di Health Connect.')}
        </p>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="font-medium">{t('Km automatici da {app}', { app: nome })}</span>
          <span className="block text-xs text-zinc-500">{t('Dopo ogni partita, aprendo l’app, i tuoi km compaiono da soli accanto al tuo nome.')}</span>
        </span>
        <input type="checkbox" checked={attivi} disabled={pending} onChange={cambia} className="h-5 w-5 shrink-0 accent-green-600" />
      </label>
    </div>
  )
}
