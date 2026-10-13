import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTATTO_EMAIL } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Supporto · TheCap' }

export default function SupportoPage() {
  return (
    <>
      <h1>Supporto</h1>
      <p>
        Per domande, problemi o richieste sui tuoi dati scrivi a <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>: rispondiamo
        il prima possibile.
      </p>

      <h2>Domande frequenti</h2>
      <p>
        <b>Come entro nella lega dei miei amici?</b>
        <br />
        Chiedi all&apos;organizzatore il link d&apos;invito e aprilo: dopo l&apos;accesso entri subito nella rosa.
      </p>
      <p>
        <b>Non ricevo le notifiche.</b>
        <br />
        Vai su Profilo → Notifiche → Attiva notifiche, e controlla nelle impostazioni del telefono che TheCap possa inviarle.
      </p>
      <p>
        <b>Come elimino il mio account?</b>
        <br />
        Profilo → Elimina account. Vengono cancellati account e dati personali.
      </p>

      <p>
        <Link href="/privacy">Informativa sulla privacy</Link>
      </p>
    </>
  )
}
