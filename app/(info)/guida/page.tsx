import type { Metadata } from 'next'
import { getT } from '@/lib/lingua'
import { MAX_GIOCATORI, MAX_ISCRITTI } from '@/lib/limiti'
import { PUNTI } from '@/lib/punteggio'
import { SKILLS, SKILL_DESCRIPTIONS, type Skill } from '@/lib/roster'
import { PESI } from '@/lib/teams'
import { MODIFICA_MAX, MODIFICA_MIN, PARTITE_PER_REVISIONE } from '@/lib/forma'
import { TROFEI } from '@/lib/trofei'

export const metadata: Metadata = { title: 'Come funziona · TheCap' }

// "Come funziona": istruzioni base e regole dei calcoli. I numeri arrivano dal codice (punti, pesi, limiti,
// trofei), così la pagina resta giusta anche se cambiano.
export default async function GuidaPage() {
  const t = await getT()
  const n = (x: number) => t.numero(x, { maximumFractionDigits: 2 })
  const skills = Object.keys(SKILLS) as Skill[]
  const principali = skills.filter((k) => PESI[k] > 1)
  const secondarie = skills.filter((k) => PESI[k] <= 1)
  const nomi = (ks: Skill[]) => ks.map((k) => t(SKILLS[k]).toLowerCase()).join(', ')
  const it = t.lingua === 'it'

  return (
    <>
      <h1>📖 {it ? 'Come funziona The Cap' : 'How The Cap works'}</h1>

      <h2>{it ? 'Le basi' : 'The basics'}</h2>
      {it ? (
        <ul>
          <li><b>Leghe</b>: il gruppo con cui giochi. Puoi far parte di più leghe e passare dall&apos;una all&apos;altra dal nome in alto.</li>
          <li><b>Rispondere</b>: quando le convocazioni sono aperte tocca <b>Ci sono</b> o <b>Non ci sono</b>. Puoi cambiare idea finché sono aperte.</li>
          <li><b>Invitare</b>: l&apos;organizzatore manda il link o il codice della lega (Impostazioni lega o Partite → Invita amici).</li>
          <li><b>Calendario</b>: con l&apos;icona nel Calendario aggiungi tutte le partite al calendario del telefono, che si aggiorna da solo.</li>
          <li><b>Foto sorpresa</b>: scuoti il telefono nell&apos;app e compare una foto a caso della lega.</li>
        </ul>
      ) : (
        <ul>
          <li><b>Leagues</b>: your group. You can be in several leagues and switch from the name at the top.</li>
          <li><b>Replying</b>: while call-ups are open tap <b>I&apos;m in</b> or <b>I&apos;m out</b>; you can change your mind until they close.</li>
          <li><b>Inviting</b>: the organiser shares the league link or code (League settings or Matches → Invite friends).</li>
          <li><b>Calendar</b>: the icon in Calendar adds every match to your phone calendar, kept up to date.</li>
          <li><b>Surprise photo</b>: shake your phone in the app to see a random league photo.</li>
        </ul>
      )}

      <h2>{it ? 'Convocazioni' : 'Call-ups'}</h2>
      {it ? (
        <ul>
          <li>Le convocazioni si aprono e si chiudono agli orari scelti dall&apos;organizzatore; all&apos;apertura arriva la notifica <b>Convocazioni aperte</b>.</li>
          <li><b>Numero fisso</b> (es. 10, 12, 14, massimo {MAX_GIOCATORI}): i primi che rispondono sono in lista, gli altri in <b>lista d&apos;attesa</b>.</li>
          <li><b>In base alle convocazioni</b>: si iscrive chi vuole, fino a <b>{MAX_ISCRITTI}</b>; alla chiusura il numero diventa pari (11 iscritti → 5 contro 5 e l&apos;ultimo arrivato in attesa).</li>
          <li>Se qualcuno in lista si toglie, sale il primo in attesa.</li>
          <li>30 minuti prima della chiusura chi non ha risposto riceve il <b>sollecito</b>; alla chiusura chi è in lista riceve <b>Convocazioni chiuse – Ricordate le pettorine</b>.</li>
        </ul>
      ) : (
        <ul>
          <li>Call-ups open and close at the times set by the organiser; when they open you get a <b>Call-ups open</b> notification.</li>
          <li><b>Fixed number</b> (e.g. 10, 12, 14, max {MAX_GIOCATORI}): the first to reply are in, the rest on the <b>waiting list</b>.</li>
          <li><b>Based on call-ups</b>: anyone can join, up to <b>{MAX_ISCRITTI}</b>; at closing the number becomes even (11 players → 5 vs 5, the last one waits).</li>
          <li>If someone in the list drops out, the first on the waiting list moves up.</li>
          <li>30 minutes before closing, whoever hasn&apos;t replied gets a <b>reminder</b>; at closing, players in the list get <b>Call-ups closed – Remember the bibs</b>.</li>
        </ul>
      )}

      <h2>{it ? 'Per gli organizzatori' : 'For organisers'}</h2>
      {it ? (
        <ul>
          <li><b>Convocare</b> qualcuno: scorri il suo nome verso destra tra i «non ci sono».</li>
          <li><b>Escludere</b> qualcuno: scorri il suo nome verso sinistra (in lista o in attesa).</li>
          <li><b>Scambiare</b> uno in attesa con uno in lista: ⇄ Scambia; con ➕ Aggiungi invece entra in più (i posti aumentano).</li>
          <li><b>Formazioni</b>: dopo aver chiuso le convocazioni, l&apos;app propone due squadre equilibrate che puoi modificare.</li>
          <li><b>Risultato</b>: a fine partita si inseriscono gol, marcatori e MVP 🫑.</li>
        </ul>
      ) : (
        <ul>
          <li><b>Call someone up</b>: swipe their name to the right among those not coming.</li>
          <li><b>Remove someone</b>: swipe their name to the left (in the list or waiting).</li>
          <li><b>Swap</b> someone waiting with someone in the list: ⇄ Swap; ➕ Add lets them in as an extra (more places).</li>
          <li><b>Line-ups</b>: after closing call-ups, the app suggests two balanced teams you can edit.</li>
          <li><b>Result</b>: after the match enter goals, scorers and MVP 🫑.</li>
        </ul>
      )}

      <h2>{it ? 'Caratteristiche e voto' : 'Ratings'}</h2>
      <p>
        {it
          ? 'Ogni giocatore ha 7 caratteristiche da 1 a 10, decise dagli organizzatori. Il voto in grande è la loro media.'
          : 'Each player has 7 ratings from 1 to 10, set by the organisers. The big number is their average.'}
      </p>
      <ul>
        {skills.map((k) => (
          <li key={k}>
            <b>{t(SKILLS[k])}</b>: {t(SKILL_DESCRIPTIONS[k])}
          </li>
        ))}
      </ul>
      <p>
        {it
          ? 'Colore del voto: viola da 8,5, verde da 6,5, giallo da 5, rosso da 2, nero sotto il 2.'
          : 'Rating colour: purple from 8.5, green from 6.5, yellow from 5, red from 2, black below 2.'}
      </p>

      <h2>{it ? 'Squadre equilibrate' : 'Balanced teams'}</h2>
      <p>
        {it
          ? `La forza di un giocatore è la media pesata delle caratteristiche: ${nomi(principali)} contano il triplo di ${nomi(secondarie)}. L'app divide i giocatori in modo che le due squadre abbiano forza simile e che ${nomi(principali)} siano ben distribuite (non tutti i più veloci o tutti i difensori dalla stessa parte). Con The Cap Pro conta anche la forma del momento.`
          : `A player's strength is the weighted average of their ratings: ${nomi(principali)} count three times as much as ${nomi(secondarie)}. The app splits players so both teams have similar strength and ${nomi(principali)} are well spread. With The Cap Pro, current form counts too.`}
      </p>

      <h2>{it ? 'Classifica' : 'Standings'}</h2>
      <p>{it ? 'Punti a ogni partita giocata:' : 'Points for every match played:'}</p>
      <ul>
        <li>{it ? 'Vittoria' : 'Win'}: +{n(PUNTI.vittoria)} · {it ? 'Pareggio' : 'Draw'}: +{n(PUNTI.pareggio)}</li>
        <li>{it ? 'Ogni gol segnato' : 'Each goal scored'}: +{n(PUNTI.gol)} · MVP 🫑: +{n(PUNTI.mvp)}</li>
        <li>{it ? 'Ogni gol subito dalla tua squadra' : 'Each goal conceded by your team'}: {n(PUNTI.golSubito)}</li>
      </ul>
      <p>{it ? 'A parità di punti è davanti chi ha giocato meno partite.' : 'On equal points, whoever played fewer matches ranks higher.'}</p>

      <h2>{it ? 'Trofei' : 'Trophies'}</h2>
      <ul>
        {Object.values(TROFEI).map((tr) => (
          <li key={tr.nome}>
            {tr.emoji} <b>{t(tr.nome)}</b>: {t(tr.descrizione)}
          </li>
        ))}
      </ul>

      <h2>{it ? 'Km percorsi' : 'Distance'}</h2>
      <p>
        {it
          ? 'Facoltativi: l’app legge da Apple Salute o Health Connect solo la distanza registrata durante l’orario della partita (con il tuo consenso), oppure si inseriscono a mano. Contano per il trofeo Maratoneta e, con Pro, per fiato e scatto.'
          : 'Optional: the app reads from Apple Health or Health Connect only the distance recorded during the match (with your consent), or you enter it by hand. It counts for the Marathoner trophy and, with Pro, for stamina and acceleration.'}
      </p>

      <h2>The Cap Pro</h2>
      {it ? (
        <ul>
          <li><b>Forma</b> (da −1 a +1): dopo ogni partita sale per chi fa meglio del previsto (la squadra più forte sulla carta dovrebbe vincere), per i gol oltre quelli attesi e per l&apos;MVP; scende nel caso contrario. Le partite vecchie pesano sempre meno.</li>
          <li><b>Proposte di voto</b>: ogni {PARTITE_PER_REVISIONE} partite l&apos;app propone di aggiornare le caratteristiche, guardando le ultime (fino a 10):
            gol rispetto agli attesi → tecnica · MVP → cervello · km → fiato e scatto · gol subiti dalla squadra rispetto agli attesi → difesa · risultati rispetto alle attese → un po&apos; tutte.</li>
          <li>Ogni modifica va da {n(MODIFICA_MIN)} a {n(MODIFICA_MAX)}, a passi di 0,05; l&apos;organizzatore la approva o la scarta. Nel profilo la parte viola mostra quanto è migliorato rispetto ai voti di partenza, quella rossa quanto è peggiorato.</li>
          <li>Con Pro si creano anche i <b>tornei</b> (girone, eliminazione diretta o gironi + tabellone).</li>
        </ul>
      ) : (
        <ul>
          <li><b>Form</b> (−1 to +1): after each match it rises for whoever does better than expected (the stronger team on paper should win), for goals above expectation and for MVP; it falls otherwise. Older matches count less and less.</li>
          <li><b>Rating proposals</b>: every {PARTITE_PER_REVISIONE} matches the app proposes updated ratings from the latest ones (up to 10):
            goals vs expected → technique · MVP → game sense · km → stamina and acceleration · goals conceded by the team vs expected → defence · results vs expectations → a bit of everything.</li>
          <li>Each change is between {n(MODIFICA_MIN)} and {n(MODIFICA_MAX)}, in steps of 0.05; the organiser approves or discards it. In the profile, purple shows improvement over the starting ratings, red shows decline.</li>
          <li>Pro also unlocks <b>tournaments</b> (league, knockout or groups + bracket).</li>
        </ul>
      )}
    </>
  )
}
