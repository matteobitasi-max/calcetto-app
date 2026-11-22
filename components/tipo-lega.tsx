import { salvaFormatoLega, salvaOpzioneSquadra, salvaTipoLega, scegliClub } from '@/app/actions'
import { SubmitButton } from './submit-button'
import { Card } from './ui'
import { EtichettaClub } from './pill-scelta'
import { FormatoLega } from './formato-lega'
import { isFormato } from '@/lib/moduli'
import type { Lega } from '@/lib/roster'
import { getT } from '@/lib/lingua'

// Impostazioni lega → Tipo di lega: tra amici o Club Allenatore (a pagamento: senza Club attivo porta al pagamento).
// Con il Club: le regole della squadra (convocarsi da soli, pagelle) e formato e modulo preferito.
export async function TipoLega({ lega }: { lega: Lega }) {
  const t = await getT()
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">🧢 {t('Tipo di lega')}</h2>
      <div className="grid gap-2">
        {(
          [
            ['amici', '👥', t('Tra amici'), t('Chi risponde per primo gioca, con la lista d’attesa.'), salvaTipoLega.bind(null, lega._id, 'amici')],
            ['club', '🧢', t('Club Allenatore'), t('Convocati scelti dall’allenatore, infortunati e squalificati, pagelle a fine partita. Include tutto il Pro.'), scegliClub.bind(null, lega._id)],
          ] as const
        ).map(([valore, emoji, titolo, testo, azione]) => {
          const scelto = valore === 'club' ? !!lega.club && lega.tipo === 'squadra' : !(lega.club && lega.tipo === 'squadra')
          return (
            <form key={valore} action={azione}>
              <SubmitButton
                className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${scelto ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'}`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {titolo}
                    {valore === 'club' && <EtichettaClub />}
                  </span>
                  <span className="block text-sm text-zinc-500">{testo}</span>
                </span>
                {scelto && <span className="text-green-600">✓</span>}
              </SubmitButton>
            </form>
          )
        })}
        {lega.club &&
          lega.tipo === 'squadra' &&
          (
            [
              ['autoconvocazione', !!lega.autoconvocazione, t('I giocatori possono convocarsi da soli'), t('Sì: ognuno può dire “ci sono”, come tra amici. No: risponde solo chi convochi tu.')],
              ['pagelle', lega.pagelle !== false, t('Pagelle a fine partita, con note'), t('Voto da 1 a 10 a chi era in lista. Il voto lo vedono tutti, la nota solo il giocatore e gli organizzatori.')],
            ] as const
          ).map(([opzione, attiva, titolo, testo]) => (
            <form key={opzione} action={salvaOpzioneSquadra.bind(null, lega._id, opzione, !attiva)} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{titolo}</span>
                <span className="block text-xs text-zinc-500">{testo}</span>
              </span>
              <SubmitButton
                aria-pressed={attiva}
                aria-label={titolo}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${attiva ? 'bg-green-600 text-white' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
              >
                {attiva ? t('Sì') : t('No')}
              </SubmitButton>
            </form>
          ))}
        {lega.club && lega.tipo === 'squadra' && (
          <FormatoLega azione={salvaFormatoLega.bind(null, lega._id)} formato={isFormato(lega.formato) ? lega.formato : 11} modulo={lega.modulo} />
        )}
      </div>
    </Card>
  )
}
