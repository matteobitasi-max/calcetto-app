import Link from 'next/link'
import type { Consensi } from '@/lib/consensi'
import { getT } from '@/lib/lingua'

// Le caselle dei consensi: i Termini (solo al primo accesso, obbligatori) e foto e video (facoltativo, si cambia quando si vuole).
export async function CampiConsensi({ consensi, conTermini = false }: { consensi: Consensi; conTermini?: boolean }) {
  const t = await getT()
  const link = 'font-medium text-green-700 underline dark:text-green-400'
  return (
    <div className="space-y-3 text-sm">
      {conTermini && (
        <label className="flex items-start gap-3">
          <input type="checkbox" name="accettoTermini" required className="mt-0.5 h-5 w-5 shrink-0 accent-green-600" />
          <span>
            {t('Accetto i')}{' '}
            <Link href="/termini" target="_blank" className={link}>
              {t('Termini d’uso')}
            </Link>{' '}
            {t('e ho letto l’')}
            <Link href="/privacy" target="_blank" className={link}>
              {t('Informativa privacy')}
            </Link>
            . <span className="text-zinc-500">({t('obbligatorio')})</span>
          </span>
        </label>
      )}
      <input type="hidden" name="sceltaImmagini" value="1" />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="consensoImmagini" defaultChecked={consensi.immagini?.si ?? false} className="mt-0.5 h-5 w-5 shrink-0 accent-green-600" />
        <span>
          {t('Acconsento alla pubblicazione, da parte del creatore della lega, di foto e video in cui compaio (ad esempio le interviste).')}{' '}
          <span className="text-zinc-500">({t('facoltativo, puoi cambiarlo quando vuoi')})</span>
        </span>
      </label>
    </div>
  )
}
