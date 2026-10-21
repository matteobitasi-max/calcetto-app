import type { Metadata } from 'next'
import { CONTATTO_EMAIL, TITOLARE } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Privacy · TheCap' }

export default function PrivacyPage() {
  return (
    <>
      <h1>Informativa sulla privacy</h1>
      <p>Ultimo aggiornamento: ottobre 2026.</p>
      <p>
        TheCap è un&apos;app per organizzare partite di calcetto tra amici: convocazioni, formazioni, risultati e quote. Il titolare del
        trattamento è <b>{TITOLARE}</b>, contattabile a <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>.
      </p>

      <h2>Quali dati trattiamo</h2>
      <ul>
        <li>
          <b>Account</b>: email o numero di telefono, nome e cognome, usati per l&apos;accesso.
        </li>
        <li>
          <b>Scheda giocatore</b>: nome, soprannome, foto, ruolo, piede, età (se indichi la data di nascita), badge e caratteristiche tecniche, inseriti da te o dagli
          organizzatori della tua lega e visibili solo ai membri della lega. Il titolare dell&apos;app può accedere ai dati di una lega
          solo per assistenza e moderazione (ad esempio per correggere un errore o aiutare un organizzatore).
        </li>
        <li>
          <b>Attività nella lega</b>: risposte alle convocazioni, squadre, gol, MVP, statistiche e lo stato di pagamento delle quote.
          L&apos;app non tratta dati di pagamento: i pagamenti avvengono fuori dall&apos;app (es. Satispay).
        </li>
        <li>
          <b>Notifiche</b>: un identificativo tecnico del dispositivo, se attivi le notifiche, e le tue preferenze sulle notifiche.
        </li>
        <li>
          <b>Km percorsi</b>: i km di ogni partita, visibili ai membri della lega. Solo se lo scegli, li prendiamo
          da <b>Apple Health</b> (l&apos;app Salute di iPhone) o <b>Health Connect</b> (Android): la distanza camminata/corsa registrata durante
          l&apos;orario della partita, nient&apos;altro. I dati di salute non vengono usati per pubblicità né venduti.
          In alternativa da <b>Strava</b> (la distanza dell&apos;attività fatta durante la partita).
          Per Strava conserviamo il collegamento al tuo account, che puoi togliere quando vuoi da &ldquo;Il mio account&rdquo;.
        </li>
        <li>
          <b>Cookie tecnici</b>: per mantenere l&apos;accesso e ricordare la lega attiva. Nessun cookie di profilazione o pubblicità.
        </li>
      </ul>

      <h2>Perché li trattiamo</h2>
      <p>
        Solo per far funzionare l&apos;app (esecuzione del servizio che richiedi): accesso, gestione delle leghe e delle partite, invio delle
        notifiche. Non vendiamo dati, non facciamo pubblicità né profilazione.
      </p>

      <h2>Chi li tratta per noi</h2>
      <ul>
        <li>
          <b>Clerk</b> (accesso e account) · <b>Sanity</b> (archivio dei dati) · <b>Vercel</b> (server dell&apos;app) ·{' '}
          <b>Google Firebase</b> e i servizi di notifica di <b>Apple</b> e <b>Google</b> (notifiche) · <b>Strava</b> (solo se lo
          colleghi, per i km).
        </li>
        <li>Alcuni di questi fornitori possono trattare i dati fuori dall&apos;UE, con le garanzie previste dal GDPR.</li>
      </ul>

      <h2>Quanto li conserviamo</h2>
      <p>
        Finché hai un account. Se lo elimini, cancelliamo account e dati personali; nei risultati delle partite già giocate resti come
        &quot;Ex giocatore&quot;, senza nome né foto, perché le statistiche degli altri restino corrette.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei tuoi dati, e opporti al trattamento. Puoi eliminare
        l&apos;account in qualsiasi momento dall&apos;app: <b>Profilo → Elimina account</b>, oppure scrivendo a{' '}
        <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>. Puoi anche rivolgerti al Garante per la protezione dei dati personali.
      </p>

      <h2>Minori</h2>
      <p>L&apos;app è pensata per persone dai 14 anni in su.</p>
    </>
  )
}
