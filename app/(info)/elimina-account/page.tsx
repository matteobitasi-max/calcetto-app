import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTATTO_EMAIL } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Elimina account · TheCap' }

// Pagina pubblica per la richiesta di eliminazione dell'account (richiesta da Google Play).
export default function EliminaAccountPage() {
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
