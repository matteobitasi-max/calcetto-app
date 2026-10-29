import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/lingua'
import { CONTATTO_EMAIL } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Elimina account · TheCap' }

// Pagina pubblica per la richiesta di eliminazione dell'account (richiesta da Google Play).
export default async function EliminaAccountPage() {
  const t = await getT()
  // in inglese anche per spagnolo, tedesco e francese (testi da far tradurre a parte)
  if (t.lingua !== 'it') return <InEnglish />
  return (
    <>
      <h1>Eliminare il tuo account TheCap</h1>
      <p>Puoi eliminare il tuo account in qualsiasi momento, in uno di questi modi:</p>

      <h2>Dall&apos;app o dal sito</h2>
      <ul>
        <li>Apri TheCap e accedi.</li>
        <li>
          Tocca la tua foto in alto a destra per aprire il <b>Profilo</b>.
        </li>
        <li>
          In fondo alla pagina tocca <b>Elimina account</b> e conferma.
        </li>
      </ul>
      <p>
        <Link href="/profilo">Accedi e vai al tuo profilo →</Link>
      </p>

      <h2>Via email</h2>
      <p>
        Scrivi a <a href={`mailto:${CONTATTO_EMAIL}?subject=Eliminazione account TheCap`}>{CONTATTO_EMAIL}</a> dall&apos;indirizzo
        con cui accedi (o indicando il tuo numero di telefono): eliminiamo l&apos;account entro 30 giorni.
      </p>

      <h2>Cosa viene eliminato</h2>
      <ul>
        <li>L&apos;account di accesso (email, telefono, password).</li>
        <li>Nome, soprannome, foto, contatti e preferenze nelle schede di tutte le leghe.</li>
        <li>I dispositivi registrati per le notifiche.</li>
      </ul>
      <p>
        Nei risultati delle partite già giocate resti come &quot;Ex giocatore&quot;, senza nome né foto, perché statistiche e classifiche degli
        altri restino corrette. Non conserviamo altri dati personali.
      </p>
    </>
  )
}

// English version.
function InEnglish() {
  return (
    <>
      <h1>Delete your TheCap account</h1>
      <p>You can delete your account at any time, in one of these ways:</p>

      <h2>From the app or the website</h2>
      <ul>
        <li>Open TheCap and sign in.</li>
        <li>
          Tap your photo at the top right to open your <b>Profile</b>.
        </li>
        <li>
          At the bottom of the page tap <b>Delete account</b> and confirm.
        </li>
      </ul>
      <p>
        <Link href="/profilo">Sign in and go to your profile →</Link>
      </p>

      <h2>By email</h2>
      <p>
        Write to <a href={`mailto:${CONTATTO_EMAIL}?subject=TheCap account deletion`}>{CONTATTO_EMAIL}</a> from the address you sign in
        with (or stating your phone number): we delete the account within 30 days.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>The sign-in account (email, phone, password).</li>
        <li>Name, nickname, photo, contacts and preferences on your cards in every league.</li>
        <li>The devices registered for notifications.</li>
      </ul>
      <p>
        In the results of matches already played you remain as &quot;Former player&quot;, with no name or photo, so that other people&apos;s
        stats and standings stay correct. We keep no other personal data.
      </p>
    </>
  )
}
