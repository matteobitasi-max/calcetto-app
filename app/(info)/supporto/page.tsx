import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/lingua'
import { CONTATTO_EMAIL } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Supporto · TheCap' }

export default async function SupportoPage() {
  const t = await getT()
  // in inglese anche per spagnolo, tedesco e francese (testi da far tradurre a parte)
  if (t.lingua !== 'it') return <InEnglish />
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
        <b>Come cambio la lingua?</b>
        <br />
        Profilo → Lingua, in fondo alla pagina.
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

// English version.
function InEnglish() {
  return (
    <>
      <h1>Support</h1>
      <p>
        For questions, problems or requests about your data, write to <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>: we&apos;ll
        reply as soon as possible.
      </p>

      <h2>Frequently asked questions</h2>
      <p>
        <b>How do I join my friends&apos; league?</b>
        <br />
        Ask the organiser for the invite link and open it: after signing in you join the squad right away.
      </p>
      <p>
        <b>I don&apos;t get notifications.</b>
        <br />
        Go to Profile → Notifications → Turn on notifications, and check in your phone settings that TheCap is allowed to send them.
      </p>
      <p>
        <b>How do I change the language?</b>
        <br />
        Profile → Language, at the bottom of the page.
      </p>
      <p>
        <b>How do I delete my account?</b>
        <br />
        Profile → Delete account. Your account and personal data are deleted.
      </p>

      <p>
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </>
  )
}
