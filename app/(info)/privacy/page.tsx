import type { Metadata } from 'next'
import { getT } from '@/lib/lingua'
import { CONTATTO_EMAIL, TITOLARE } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Privacy · TheCap' }

export default async function PrivacyPage() {
  const t = await getT()
  // in inglese anche per spagnolo, tedesco e francese (testi da far tradurre a parte)
  if (t.lingua !== 'it') return <InEnglish />
  return (
    <>
      <h1>Informativa sulla privacy</h1>
      <p>Ultimo aggiornamento: 28 ottobre 2026.</p>
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
          <b>Foto e video</b>: la foto profilo, le foto della lega e, se l&apos;organizzatore le collega, le interviste video
          pubblicate su YouTube, visibili ai membri della lega. Chi le carica deve avere il consenso delle persone riprese (vedi i{' '}
          <a href="/termini">Termini d&apos;uso</a>). In &quot;Il mio account&quot; indichi se acconsenti alla pubblicazione di foto e video
          in cui compari: la scelta si può cambiare quando vuoi.
        </li>
        <li>
          <b>Consensi</b>: l&apos;accettazione dei Termini d&apos;uso e le tue scelte su foto, video e km, con la data, per poterle dimostrare.
        </li>
        <li>
          <b>Notifiche</b>: un identificativo tecnico del dispositivo, se attivi le notifiche, e le tue preferenze sulle notifiche.
        </li>
        <li>
          <b>Km percorsi</b>: i km di ogni partita, visibili ai membri della lega. Solo se lo scegli, li prendiamo
          da <b>Apple Health</b> (l&apos;app Salute di iPhone) o <b>Health Connect</b> (Android): la distanza camminata/corsa registrata durante
          l&apos;orario della partita, nient&apos;altro. Sono dati legati alla salute: li trattiamo solo con il tuo{' '}
          <b>consenso esplicito</b>, che ti chiediamo quando attivi la funzione e che puoi revocare disattivandola. I dati di salute non
          vengono usati per pubblicità né venduti.
          In alternativa da <b>Strava</b> (la distanza dell&apos;attività fatta durante la partita).
          Per Strava conserviamo il collegamento al tuo account, che puoi togliere quando vuoi da &ldquo;Il mio account&rdquo;.
        </li>
        <li>
          <b>Cookie tecnici</b>: per mantenere l&apos;accesso e ricordare la lega attiva. Nessun cookie di profilazione o pubblicità.
        </li>
      </ul>

      <h2>Perché li trattiamo</h2>
      <p>
        Per far funzionare l&apos;app (esecuzione del servizio che richiedi): accesso, gestione delle leghe e delle partite, invio delle
        notifiche. Per foto e video in cui compari e per i km da Apple Salute o Health Connect, sulla base del tuo consenso. Non vendiamo
        dati, non facciamo pubblicità né profilazione.
      </p>

      <h2>Chi li tratta per noi</h2>
      <ul>
        <li>
          <b>Clerk</b> (accesso e account) · <b>Sanity</b> (archivio dei dati) · <b>Vercel</b> (server dell&apos;app) ·{' '}
          <b>Google Firebase</b> e i servizi di notifica di <b>Apple</b> e <b>Google</b> (notifiche) · <b>Strava</b> (solo se lo
          colleghi, per i km) · <b>YouTube</b> (solo per le interviste video, se l&apos;organizzatore collega una playlist) ·{' '}
          <b>Apple</b> e <b>Google</b> con <b>RevenueCat</b> (abbonamento Pro).
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
      <p>
        L&apos;app è pensata per persone dai 14 anni in su. Per pubblicare foto e video di minori di 18 anni serve il consenso di chi ne
        esercita la responsabilità genitoriale.
      </p>
    </>
  )
}

// English version.
function InEnglish() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>Last updated: 28 October 2026.</p>
      <p>
        TheCap is an app to organise five-a-side football matches among friends: call-ups, line-ups, results and fees. The data controller
        is <b>{TITOLARE}</b>, reachable at <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>.
      </p>

      <h2>What data we process</h2>
      <ul>
        <li>
          <b>Account</b>: email or phone number, first and last name, used to sign in.
        </li>
        <li>
          <b>Player card</b>: name, nickname, photo, position, foot, age (if you enter your date of birth), badge and technical attributes,
          entered by you or by your league&apos;s organisers and visible only to league members. The app owner can access a league&apos;s
          data only for support and moderation (for example to fix a mistake or help an organiser).
        </li>
        <li>
          <b>League activity</b>: call-up replies, teams, goals, MVPs, stats and fee payment status. The app does not process payment
          data: payments happen outside the app (e.g. Satispay).
        </li>
        <li>
          <b>Photos and videos</b>: your profile photo, league photos and, if the organiser links them, video interviews published on
          YouTube, visible to league members. Whoever uploads them must have the consent of the people shown (see the{' '}
          <a href="/termini">Terms of use</a>). In &quot;My account&quot; you state whether you consent to photos and videos in which you
          appear; you can change this at any time.
        </li>
        <li>
          <b>Consents</b>: your acceptance of the Terms of use and your choices on photos, videos and distance, with their date.
        </li>
        <li>
          <b>Notifications</b>: a technical device identifier, if you turn on notifications, and your notification preferences.
        </li>
        <li>
          <b>Distance run</b>: the km of each match, visible to league members. Only if you choose to, we take them from <b>Apple Health</b>{' '}
          (the iPhone Health app) or <b>Health Connect</b> (Android): the walking/running distance recorded during the match, nothing else.
          This is health-related data: we process it only with your <b>explicit consent</b>, asked when you turn the feature on and
          withdrawn by turning it off. Health data is never used for advertising or sold. Alternatively from <b>Strava</b> (the distance of the activity recorded during
          the match). For Strava we keep the connection to your account, which you can remove any time from &ldquo;My account&rdquo;.
        </li>
        <li>
          <b>Technical cookies</b>: to keep you signed in and remember your active league and language. No profiling or advertising cookies.
        </li>
      </ul>

      <h2>Why we process it</h2>
      <p>
        To make the app work (performance of the service you request): sign-in, managing leagues and matches, sending notifications. For
        photos and videos in which you appear and for distance from Apple Health or Health Connect, based on your consent. We don&apos;t
        sell data, and we don&apos;t do advertising or profiling.
      </p>

      <h2>Who processes it for us</h2>
      <ul>
        <li>
          <b>Clerk</b> (sign-in and accounts) · <b>Sanity</b> (data storage) · <b>Vercel</b> (app servers) · <b>Google Firebase</b> and the
          notification services of <b>Apple</b> and <b>Google</b> (notifications) · <b>Strava</b> (only if you connect it, for km) ·{' '}
          <b>YouTube</b> (only for video interviews, if the organiser links a playlist) · <b>Apple</b> and <b>Google</b> with{' '}
          <b>RevenueCat</b> (Pro subscription).
        </li>
        <li>Some of these providers may process data outside the EU, with the safeguards required by the GDPR.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        As long as you have an account. If you delete it, we delete your account and personal data; in the results of matches already
        played you remain as &quot;Former player&quot;, with no name or photo, so that other people&apos;s stats stay correct.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request access, rectification, erasure, restriction and portability of your data, and object to processing. You can delete
        your account at any time from the app: <b>Profile → Delete account</b>, or by writing to{' '}
        <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>. You can also contact the Italian Data Protection Authority (Garante per
        la protezione dei dati personali).
      </p>

      <h2>Minors</h2>
      <p>
        The app is intended for people aged 14 and over. Publishing photos or videos of under-18s requires the consent of their parent or
        guardian.
      </p>
    </>
  )
}
