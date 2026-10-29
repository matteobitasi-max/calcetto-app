import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/lingua'
import { CONTATTO_EMAIL, TITOLARE } from '@/lib/contatti'

export const metadata: Metadata = { title: 'Termini d’uso · TheCap' }

// Termini d'uso (bozza da far rivedere). Se cambiano in modo sostanziale, aggiornare VERSIONE_TERMINI
// (lib/consensi.ts): al prossimo accesso tutti li accettano di nuovo.
export default async function TerminiPage() {
  const t = await getT()
  // in inglese anche per spagnolo, tedesco e francese (testi da far tradurre a parte)
  if (t.lingua !== 'it') return <InEnglish />
  return (
    <>
      <h1>Termini d&apos;uso</h1>
      <p>Ultimo aggiornamento: 28 ottobre 2026.</p>
      <p>
        TheCap (&quot;l&apos;app&quot;) serve a organizzare partite di calcetto tra amici: leghe, convocazioni, formazioni, risultati, tornei e
        statistiche. L&apos;app è gestita da <b>{TITOLARE}</b>, contattabile a <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>.
        Usando l&apos;app accetti questi termini e l&apos;<Link href="/privacy">Informativa privacy</Link>.
      </p>

      <h2>1. Account</h2>
      <ul>
        <li>Per usare l&apos;app devi avere almeno 14 anni e indicare dati veri (nome e cognome).</li>
        <li>Sei responsabile di quello che succede con il tuo account: non condividere l&apos;accesso.</li>
        <li>Puoi eliminare l&apos;account quando vuoi dall&apos;app (Il mio account → Elimina account).</li>
      </ul>

      <h2>2. Leghe e organizzatori</h2>
      <ul>
        <li>
          Chi crea una lega e gli organizzatori che nomina gestiscono la lega: rosa, partite, squadre, voti e caratteristiche dei
          giocatori, quote, tornei e contenuti.
        </li>
        <li>
          <b>Il creatore della lega è responsabile della lega e dei contenuti pubblicati al suo interno</b>, compresi quelli inseriti
          dagli altri organizzatori, e del rispetto di questi termini verso i membri.
        </li>
        <li>Voti e caratteristiche dei giocatori sono valutazioni sportive tra amici, visibili solo ai membri della lega.</li>
      </ul>

      <h2>3. Foto, video e altri contenuti</h2>
      <ul>
        <li>
          Chi carica o collega foto e video (foto profilo, foto della lega, foto sorpresa, interviste e playlist di YouTube) dichiara di
          averne il diritto e di avere il <b>consenso delle persone riconoscibili</b>; per i minori di 18 anni, il consenso di chi ne
          esercita la responsabilità genitoriale.
        </li>
        <li>
          Ogni giocatore indica in &quot;Il mio account&quot; se acconsente alla pubblicazione di foto e video in cui compare; la scelta
          viene registrata con la data e si può cambiare in qualsiasi momento. Gli organizzatori devono tenerne conto.
        </li>
        <li>
          I video delle interviste sono ospitati su YouTube e sono soggetti anche ai termini di YouTube: l&apos;app mostra solo i video
          della playlist scelta dall&apos;organizzatore.
        </li>
        <li>
          Se un contenuto ti riguarda e vuoi che sia tolto, chiedilo all&apos;organizzatore della lega o scrivi a{' '}
          <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>: lo rimuoviamo appena possibile.
        </li>
      </ul>

      <h2>4. Km e dati di attività</h2>
      <p>
        I km delle partite sono facoltativi. L&apos;app li legge da Apple Salute, Health Connect o Strava solo se lo attivi e dai il consenso,
        e solo per l&apos;orario delle partite. I km sono visibili ai membri della lega. Puoi disattivarli quando vuoi.
      </p>

      <h2>5. Comportamento</h2>
      <p>
        Non sono ammessi contenuti offensivi, discriminatori, illegali o che violano i diritti di altri, né spam o usi impropri dell&apos;app.
        In questi casi possiamo rimuovere contenuti e sospendere o chiudere account.
      </p>

      <h2>6. Quote delle partite</h2>
      <p>
        I pagamenti delle quote avvengono fuori dall&apos;app (ad esempio Satispay o contanti). L&apos;app aiuta solo a tenerne traccia: non
        gestisce denaro e non è responsabile dei pagamenti tra giocatori.
      </p>

      <h2>7. The Cap Pro</h2>
      <ul>
        <li>
          Pro è un abbonamento acquistato tramite App Store o Google Play, alle condizioni e ai prezzi indicati nello store (per iPhone vale
          anche la{' '}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">
            licenza d&apos;uso standard di Apple
          </a>
          ).
        </li>
        <li>
          L&apos;abbonamento si rinnova automaticamente se non lo disdici prima della scadenza, dalle impostazioni del tuo account Apple o
          Google. Rimborsi e disdette sono gestiti dallo store.
        </li>
      </ul>

      <h2>8. Responsabilità</h2>
      <p>
        L&apos;app è offerta così com&apos;è: facciamo il possibile perché funzioni, ma non garantiamo che sia sempre disponibile o senza
        errori. Le partite sono organizzate dai giocatori: l&apos;app non è responsabile dell&apos;organizzazione, dei campi, di infortuni o di
        quanto accade durante le partite. Restano salvi i diritti che la legge riconosce ai consumatori.
      </p>

      <h2>9. Modifiche</h2>
      <p>
        Possiamo aggiornare questi termini. Se le modifiche sono importanti te lo chiederemo nell&apos;app al prossimo accesso.
      </p>

      <h2>10. Legge applicabile</h2>
      <p>Questi termini sono regolati dalla legge italiana. Per i consumatori resta competente il foro del luogo di residenza.</p>
    </>
  )
}

// English version.
function InEnglish() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>Last updated: 28 October 2026.</p>
      <p>
        TheCap (&quot;the app&quot;) helps friends organise five-a-side football: leagues, call-ups, line-ups, results, tournaments and stats. The
        app is run by <b>{TITOLARE}</b>, reachable at <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>. By using the app you accept
        these terms and the <Link href="/privacy">Privacy policy</Link>.
      </p>

      <h2>1. Account</h2>
      <ul>
        <li>You must be at least 14 and give your real first and last name.</li>
        <li>You are responsible for your account: don&apos;t share your login.</li>
        <li>You can delete your account at any time in the app (My account → Delete account).</li>
      </ul>

      <h2>2. Leagues and organisers</h2>
      <ul>
        <li>The league creator and the organisers they appoint run the league: squad, matches, teams, ratings, fees, tournaments and content.</li>
        <li>
          <b>The league creator is responsible for the league and for the content published in it</b>, including content added by other
          organisers.
        </li>
        <li>Player ratings are friendly sporting assessments, visible only to league members.</li>
      </ul>

      <h2>3. Photos, videos and other content</h2>
      <ul>
        <li>
          Whoever uploads or links photos and videos (profile photos, league photos, surprise photos, YouTube interviews and playlists)
          confirms they have the right to do so and the <b>consent of the people who can be recognised</b>; for under-18s, the consent of
          their parent or guardian.
        </li>
        <li>
          Each player states in &quot;My account&quot; whether they consent to photos and videos in which they appear; the choice is recorded
          with its date and can be changed at any time. Organisers must take it into account.
        </li>
        <li>Interview videos are hosted on YouTube and are also subject to YouTube&apos;s terms.</li>
        <li>
          If some content concerns you and you want it removed, ask the league organiser or write to{' '}
          <a href={`mailto:${CONTATTO_EMAIL}`}>{CONTATTO_EMAIL}</a>: we will remove it as soon as possible.
        </li>
      </ul>

      <h2>4. Distance and activity data</h2>
      <p>
        Match distance is optional. The app reads it from Apple Health, Health Connect or Strava only if you turn it on and consent, and only
        for match times. Distances are visible to league members. You can turn it off at any time.
      </p>

      <h2>5. Behaviour</h2>
      <p>
        Offensive, discriminatory or illegal content, content that infringes others&apos; rights, spam and misuse are not allowed. We may
        remove content and suspend or close accounts.
      </p>

      <h2>6. Match fees</h2>
      <p>Fees are paid outside the app (e.g. Satispay or cash). The app only helps keep track: it doesn&apos;t handle money.</p>

      <h2>7. The Cap Pro</h2>
      <ul>
        <li>
          Pro is a subscription bought through the App Store or Google Play, at the terms and prices shown in the store (on iPhone the{' '}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">
            Apple standard licence
          </a>{' '}
          also applies).
        </li>
        <li>It renews automatically unless cancelled before it expires, from your Apple or Google account settings. Refunds are handled by the store.</li>
      </ul>

      <h2>8. Liability</h2>
      <p>
        The app is provided as is. Matches are organised by the players: the app is not responsible for organisation, pitches, injuries or
        anything that happens during matches. Your statutory consumer rights are not affected.
      </p>

      <h2>9. Changes</h2>
      <p>We may update these terms. If changes are significant, we will ask you in the app the next time you sign in.</p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by Italian law. Consumers may use the courts of their place of residence.</p>
    </>
  )
}
