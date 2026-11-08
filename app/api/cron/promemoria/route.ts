import { timingSafeEqual } from 'node:crypto'
import { sanity } from '@/lib/sanity'
import { inviaAGiocatori } from '@/lib/push'
import { ENTRO_CHIUSURA_MS, chiudiConvocazioni } from '@/lib/chiusura'

// Promemoria 30 minuti prima della chiusura delle convocazioni, a chi non ha ancora risposto,
// e chiusura delle convocazioni scadute (così si possono fare subito le formazioni).
// Lo chiama ogni 5 minuti un servizio esterno (cron-job.org) con "Authorization: Bearer <CRON_SECRET>".
// Ogni partita riceve un promemoria per ogni orario di chiusura (se l'organizzatore allunga, si ripete).
export async function GET(request: Request) {
  const segreto = process.env.CRON_SECRET
  const ricevuto = request.headers.get('authorization') ?? ''
  const atteso = `Bearer ${segreto}`
  if (!segreto || ricevuto.length !== atteso.length || !timingSafeEqual(Buffer.from(ricevuto), Buffer.from(atteso))) {
    return new Response('Non autorizzato', { status: 401 })
  }

  const ora = new Date()
  const tra30 = new Date(ora.getTime() + 30 * 60_000)
  const partite = await sanity.fetch<
    { _id: string; data: string; luogo: string; chiusura: string; lega: string; mancanti: string[]; convocati: number; posti: number; automatici?: boolean }[]
  >(
    `*[_type == "match" && coalesce(stato, "aperta") == "aperta"
       && aperturaConvocazioni <= $ora && chiusuraConvocazioni > $ora && chiusuraConvocazioni <= $tra30
       && coalesce(promemoriaPer, "") != chiusuraConvocazioni]{
      _id, data, luogo, "chiusura": chiusuraConvocazioni, "lega": lega->nome,
      "convocati": count(convocazioni[risposta == "presente"]), "posti": postiDisponibili, "automatici": postiAutomatici,
      "mancanti": *[_type == "player" && lega._ref == ^.lega._ref && attivo != false
        && !(_id in ^.convocazioni[].giocatore._ref)]._id
    }`,
    { ora: ora.toISOString(), tra30: tra30.toISOString() },
  )

  // convocazioni scadute (da meno di un giorno) ancora aperte: si chiudono, con l'avviso a chi è in lista
  const scadute = await sanity.fetch<string[]>(
    `*[_type == "match" && coalesce(stato, "aperta") == "aperta" && chiusuraConvocazioni <= $ora && chiusuraConvocazioni > $da]._id`,
    { ora: ora.toISOString(), da: new Date(ora.getTime() - ENTRO_CHIUSURA_MS).toISOString() },
  )
  const chiuse = []
  for (const id of scadute) if (await chiudiConvocazioni(id).catch(() => false)) chiuse.push(id)

  const esiti = []
  for (const p of partite) {
    // segnato prima di inviare: se il controllo successivo parte mentre questo invia, non si ripete
    await sanity.patch(p._id).set({ promemoriaPer: p.chiusura }).commit()
    const minuti = Math.max(1, Math.round((new Date(p.chiusura).getTime() - ora.getTime()) / 60_000))
    const r = await inviaAGiocatori(
      p.mancanti,
      (t) => ({
        title: `📣 ${t('SOLLECITO CONVOCAZIONI')} – ${p.automatici ? t('{n} convocati', { n: p.convocati }) : t('{n} convocati su {posti}', { n: p.convocati, posti: p.posti })}`,
        body: `${p.lega} · ${t('convocazioni chiudono tra {n} minuti', { n: minuti })}\n${t('Partita di {data} · {luogo}. Ci sei?', {
          data: t.data(p.data, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
          luogo: p.luogo,
        })}`,
        url: `/partite/${p._id}`,
        tag: `promemoria-${p._id}`,
      }),
      'convocazioni',
    ).catch(() => ({ inviate: 0, totali: p.mancanti.length }))
    esiti.push({ partita: p._id, destinatari: p.mancanti.length, ...r })
  }
  return Response.json({ controllate: partite.length, esiti, chiuse })
}
