import ExcelJS from 'exceljs'
import { sanity } from '@/lib/sanity'
import { modelloValido } from '@/lib/modello'
import { RUOLI } from '@/lib/roster'

// Il modello Excel per importare i giocatori in una lega: colonne pronte e menu a tendina per Ruolo,
// Torneo (i tornei non ancora finiti della lega) e Squadra (le squadre di quei tornei).
export async function GET(request: Request) {
  const url = new URL(request.url)
  const legaId = url.searchParams.get('lega') ?? ''
  if (!modelloValido(legaId, Number(url.searchParams.get('scade')), url.searchParams.get('firma') ?? '')) {
    return new Response('Link scaduto: scaricalo di nuovo dalla pagina Importa giocatori.', { status: 403 })
  }
  const lega = await sanity.fetch<{ nome: string; tornei: { nome: string; squadre: string[] }[] } | null>(
    `*[_type == "league" && _id == $legaId][0]{nome,
      "tornei": *[_type == "tournament" && lega._ref == ^._id
        && (count(*[_type == "match" && torneo._ref == ^._id]) == 0 || count(*[_type == "match" && torneo._ref == ^._id && stato != "giocata"]) > 0)]
        | order(_createdAt desc){nome, "squadre": coalesce(squadre[].nome, [])}}`,
    { legaId },
  )
  if (!lega) return new Response('Lega non trovata', { status: 404 })

  const libro = new ExcelJS.Workbook()
  libro.creator = 'The Cap'
  const foglio = libro.addWorksheet('Giocatori', { views: [{ state: 'frozen', ySplit: 1 }] })
  const colonne = [
    ['Nome *', 18],
    ['Cognome', 18],
    ['Email *', 30],
    ['Telefono', 16],
    ['Soprannome', 16],
    ['Ruolo', 16],
    ['Torneo', 24],
    ['Squadra', 22],
  ] as const
  foglio.columns = colonne.map(([header, width]) => ({ header, width }))
  const intestazione = foglio.getRow(1)
  intestazione.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  intestazione.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }

  // elenchi per i menu a tendina, in un foglio nascosto
  const elenchi = libro.addWorksheet('Elenchi', { state: 'veryHidden' })
  const tornei = lega.tornei.map((t) => t.nome)
  const squadre = [...new Set(lega.tornei.flatMap((t) => t.squadre))]
  RUOLI.forEach((r, i) => (elenchi.getCell(i + 1, 1).value = r))
  tornei.forEach((t, i) => (elenchi.getCell(i + 1, 2).value = t))
  squadre.forEach((s, i) => (elenchi.getCell(i + 1, 3).value = s))
  const menu = (colonna: string, intervallo: string, titolo: string) => {
    for (let riga = 2; riga <= 301; riga++) {
      foglio.getCell(`${colonna}${riga}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [intervallo],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: titolo,
        error: 'Scegli un valore dal menu a tendina.',
      }
    }
  }
  menu('F', `Elenchi!$A$1:$A$${RUOLI.length}`, 'Ruolo')
  if (tornei.length) menu('G', `Elenchi!$B$1:$B$${tornei.length}`, 'Torneo')
  if (squadre.length) menu('H', `Elenchi!$C$1:$C$${squadre.length}`, 'Squadra')

  const istruzioni = libro.addWorksheet('Istruzioni')
  istruzioni.getColumn(1).width = 110
  ;[
    `Modello per importare giocatori in "${lega.nome}" (The Cap).`,
    '',
    'Obbligatorio: almeno uno tra Nome ed Email (senza nome si usa la prima parte dell’email).',
    'Facoltativi: Cognome, Telefono, Soprannome, Ruolo (menu), Torneo e Squadra (menu).',
    'Torneo e Squadra: il giocatore entra in quella squadra di quel torneo. Se lasci vuoto il torneo vale quello scelto nella pagina di importazione.',
    tornei.length ? `Tornei disponibili: ${tornei.join(', ')}.` : 'In questa lega non ci sono tornei in corso.',
    '',
    'Chi è già in rosa (stessa email, o stesso nome e cognome) non viene duplicato.',
    'Compila il foglio "Giocatori", salva e caricalo nella pagina Importa giocatori.',
  ].forEach((testo, i) => (istruzioni.getCell(i + 1, 1).value = testo))
  istruzioni.getRow(1).font = { bold: true, size: 13 }

  const file = await libro.xlsx.writeBuffer()
  const nome = `thecap-giocatori-${lega.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lega'}.xlsx`
  return new Response(file as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
