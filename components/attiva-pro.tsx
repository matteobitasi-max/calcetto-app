'use client'

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { Capacitor } from '@capacitor/core'
import { Purchases, PACKAGE_TYPE, type PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { aggiornaPro } from '@/app/actions'
import { ENTITLEMENT_PRO } from '@/lib/entitlement'
import { buttonClass } from './ui-classes'
import { useT } from './lingua'

const EULA_APPLE = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

const niente = () => () => {}

export type MioPro = { scadenza?: string; store?: string; rinnovo?: boolean; dal?: string; prodotto?: string } | null

// Dove si disdice l'abbonamento, se non lo si fa dall'app (pagina Pro aperta dal sito o da un altro telefono).
const GESTIONE: Record<string, string> = {
  app_store: 'https://apps.apple.com/account/subscriptions',
  mac_app_store: 'https://apps.apple.com/account/subscriptions',
  play_store: 'https://play.google.com/store/account/subscriptions?package=com.matteobitasi.thecap',
}

// I due piani, per chi non è abbonato e non può comprare da qui (sito, o app senza acquisti attivi).
// Il prezzo vero lo mostra lo store al momento dell'acquisto.
export function PianiPro() {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-2 text-center">
      <div className="rounded-xl border-2 border-green-600 bg-green-50 p-3 dark:bg-green-950">
        <p className="font-bold">{t('Annuale')}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-300">{t('Il più conveniente')}</p>
      </div>
      <div className="rounded-xl border-2 border-zinc-200 p-3 dark:border-zinc-700">
        <p className="font-bold">{t('Mensile')}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-300">{t('Disdici quando vuoi')}</p>
      </div>
      <p className="col-span-2 text-xs text-zinc-500">{t('Primo mese gratis. Prezzi nell’App Store e in Google Play.')}</p>
    </div>
  )
}

// RevenueCat si configura una volta per avvio dell'app, con l'utente di Clerk (così l'abbonamento
// segue la persona su tutti i suoi telefoni e il server sa di chi è).
async function prepara(utente: string, chiave: string) {
  const { isConfigured } = await Purchases.isConfigured()
  if (!isConfigured) await Purchases.configure({ apiKey: chiave, appUserID: utente })
  else {
    const { appUserID } = await Purchases.getAppUserID()
    if (appUserID !== utente) await Purchases.logIn({ appUserID: utente })
  }
}

// Attivazione del Pro dentro l'app (acquisto in-app su App Store o Google Play).
export function AttivaPro({ utente, chiavi, mio }: { utente: string; chiavi: { apple: string | null; google: string | null }; mio: MioPro }) {
  const t = useT()
  const [pacchetti, setPacchetti] = useState<PurchasesPackage[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [messaggio, setMessaggio] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [inCorso, setInCorso] = useState(false)

  // Il server non sa se la pagina è aperta nell'app: si decide solo nel telefono.
  const nelBrowser = useSyncExternalStore(niente, () => true, () => false)
  const piattaforma = nelBrowser ? Capacitor.getPlatform() : 'server'
  const chiave = piattaforma === 'ios' ? chiavi.apple : piattaforma === 'android' ? chiavi.google : null
  // le app installate prima di questa versione non hanno il plugin degli acquisti
  const pronta = nelBrowser && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Purchases') && !!chiave

  useEffect(() => {
    if (!pronta || mio) return
    let vivo = true
    prepara(utente, chiave!)
      .then(() => Purchases.getOfferings())
      .then((o) => {
        if (!vivo) return
        const lista = [...(o.current?.availablePackages ?? [])].sort((a, b) => (a.packageType === PACKAGE_TYPE.ANNUAL ? -1 : b.packageType === PACKAGE_TYPE.ANNUAL ? 1 : 0))
        setPacchetti(lista)
      })
      .catch((e: { code?: string | number; message?: string }) => {
        if (!vivo) return
        // il motivo tecnico (da RevenueCat / dallo store), in piccolo: serve a capire cosa manca nella configurazione
        const motivo = [e?.code, e?.message].filter(Boolean).join(' · ').slice(0, 200)
        setErrore(`${t('Non riesco a caricare i prezzi. Controlla la connessione e riprova.')}${motivo ? `\n(${motivo})` : ''}`)
      })
    return () => {
      vivo = false
    }
  }, [pronta, mio, utente, chiave, t])

  const dopo = () =>
    startTransition(async () => {
      const r = await aggiornaPro()
      if (r?.error) setErrore(r.error)
    })

  const compra = async (p: PurchasesPackage) => {
    setErrore(null)
    setInCorso(true)
    try {
      await Purchases.purchasePackage({ aPackage: p })
      dopo()
    } catch (e) {
      const err = e as { userCancelled?: boolean; code?: string | number }
      if (!err?.userCancelled && String(err?.code) !== '1') setErrore(t('Acquisto non riuscito. Non ti è stato addebitato niente: riprova.'))
    } finally {
      setInCorso(false)
    }
  }

  const ripristina = async () => {
    setErrore(null)
    setMessaggio(null)
    setInCorso(true)
    try {
      await prepara(utente, chiave!)
      const { customerInfo } = await Purchases.restorePurchases()
      if (customerInfo.entitlements.active[ENTITLEMENT_PRO]) dopo()
      else setMessaggio(t('Nessun abbonamento Pro trovato su questo account dello store.'))
    } catch {
      setErrore(t('Ripristino non riuscito. Riprova.'))
    } finally {
      setInCorso(false)
    }
  }

  const gestisci = async () => {
    try {
      await prepara(utente, chiave!)
      const { customerInfo } = await Purchases.getCustomerInfo()
      if (customerInfo.managementURL) window.open(customerInfo.managementURL, '_blank')
    } catch {
      setErrore(t('Non riesco ad aprire la gestione dell’abbonamento.'))
    }
  }

  // Già abbonato: piano, date e come disdire
  if (mio) {
    const piano = mio.prodotto?.includes('annual') ? t('Annuale') : mio.prodotto?.includes('mensil') ? t('Mensile') : null
    const store = mio.store === 'play_store' ? 'Google Play' : mio.store?.includes('app_store') ? 'App Store' : null
    const disdici = mio.store ? GESTIONE[mio.store] : undefined
    return (
      <div className="space-y-3 text-sm">
        <p className="font-medium text-green-900 dark:text-green-200">✅ {t('Hai The Cap Pro.')}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-zinc-600 dark:text-zinc-300">
          {piano && (
            <>
              <dt>{t('Piano')}</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {piano}
                {store && ` · ${store}`}
              </dd>
            </>
          )}
          {mio.dal && (
            <>
              <dt>{t('Attivo dal')}</dt>
              <dd>{t.giorno(mio.dal)}</dd>
            </>
          )}
          {mio.scadenza && (
            <>
              <dt>{mio.rinnovo === false ? t('Termina il') : t('Si rinnova il')}</dt>
              <dd className={mio.rinnovo === false ? 'font-medium text-amber-700 dark:text-amber-400' : ''}>{t.giorno(mio.scadenza)}</dd>
            </>
          )}
        </dl>
        {mio.rinnovo === false && <p className="text-xs text-zinc-500">{t('Hai disdetto: Pro resta attivo fino a quella data, poi non si rinnova.')}</p>}
        {!mio.store && <p className="text-xs text-zinc-500">{t('Abbonamento assegnato dal titolare dell’app.')}</p>}
        {mio.store &&
          (pronta ? (
            <button type="button" onClick={gestisci} className={`${buttonClass('secondary')} w-full justify-center`}>
              {mio.rinnovo === false ? t('Riattiva o gestisci l’abbonamento') : t('Disdici o gestisci l’abbonamento')}
            </button>
          ) : (
            disdici && (
              <a href={disdici} target="_blank" rel="noreferrer" className={`${buttonClass('secondary')} w-full justify-center`}>
                {mio.rinnovo === false ? t('Riattiva o gestisci l’abbonamento') : t('Disdici o gestisci l’abbonamento')}
              </a>
            )
          ))}
        {mio.store && mio.rinnovo !== false && (
          <p className="text-xs text-zinc-500">{t('La disdetta si fa dallo store: Pro resta attivo fino alla fine del periodo già pagato.')}</p>
        )}
        {errore && <p className="text-red-600">{errore}</p>}
      </div>
    )
  }

  if (!nelBrowser) return null
  if (!Capacitor.isNativePlatform()) {
    return (
      <div className="space-y-3">
        <PianiPro />
        <p className="text-sm">{t('Puoi attivare Pro dall’app The Cap sul tuo iPhone o telefono Android, nella pagina The Cap Pro.')}</p>
      </div>
    )
  }
  if (!pronta) {
    // app aggiornata, ma gli acquisti su questo store non sono ancora configurati
    return (
      <div className="space-y-3">
        <PianiPro />
        <p className="text-sm text-zinc-500">
          {Capacitor.isPluginAvailable('Purchases') ? t('Pro non è ancora disponibile. Riprova più tardi.') : t('Aggiorna l’app The Cap dallo store per attivare Pro.')}
        </p>
      </div>
    )
  }

  const mensile = pacchetti?.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY)
  const occupato = inCorso || pending

  return (
    <div className="space-y-3">
      {!pacchetti && !errore && <p className="animate-pulse text-sm text-zinc-500">{t('Caricamento…')}</p>}
      {pacchetti?.length === 0 && <p className="text-sm text-zinc-500">{t('Pro non è ancora disponibile. Riprova più tardi.')} (offering vuota)</p>}
      {pacchetti?.map((p) => {
        const annuale = p.packageType === PACKAGE_TYPE.ANNUAL
        const prova = p.product.introPrice?.price === 0 ? p.product.introPrice : null
        const risparmio = annuale && mensile ? Math.round((1 - p.product.price / (mensile.product.price * 12)) * 100) : 0
        return (
          <button
            key={p.identifier}
            type="button"
            disabled={occupato}
            onClick={() => compra(p)}
            className={`${buttonClass(annuale ? 'primary' : 'secondary')} w-full flex-col py-3`}
          >
            <span className="text-base font-bold">
              {annuale ? t('Annuale') : t('Mensile')} · {p.product.priceString}
              {annuale ? t('/anno') : t('/mese')}
            </span>
            {(prova || risparmio > 0) && (
              <span className="text-xs font-normal opacity-90">
                {[
                  prova &&
                    (prova.periodUnit === 'MONTH' && prova.periodNumberOfUnits === 1
                      ? t('Primo mese gratis')
                      : t('Prova gratuita')),
                  risparmio > 0 && t('risparmi il {n}%', { n: risparmio }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </button>
        )
      })}
      {errore && <p className="whitespace-pre-line break-words text-sm text-red-600">{errore}</p>}
      {messaggio && <p className="text-sm text-zinc-500">{messaggio}</p>}
      <button type="button" disabled={occupato} onClick={ripristina} className="w-full text-center text-sm font-medium text-green-700 hover:underline disabled:opacity-50 dark:text-green-400">
        {t('Ripristina acquisti')}
      </button>
      <p className="text-xs text-zinc-500">
        {piattaforma === 'ios'
          ? t('Il pagamento è addebitato sul tuo account Apple. L’abbonamento si rinnova automaticamente se non lo disdici almeno 24 ore prima della scadenza, dalle impostazioni dell’account Apple.')
          : t('Il pagamento è addebitato sul tuo account Google Play. L’abbonamento si rinnova automaticamente se non lo disdici prima della scadenza, da Google Play → Abbonamenti.')}{' '}
        <a href="/privacy" className="underline">
          {t('Privacy policy')}
        </a>
        {piattaforma === 'ios' && (
          <>
            {' · '}
            <a href={EULA_APPLE} target="_blank" rel="noreferrer" className="underline">
              {t('Termini d’uso')}
            </a>
          </>
        )}
      </p>
    </div>
  )
}
