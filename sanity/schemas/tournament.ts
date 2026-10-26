import { defineArrayMember, defineField, defineType } from 'sanity'

// Torneo della lega: squadre fisse e partite generate (documenti "match" con il campo torneo).
export const tournament = defineType({
  name: 'tournament',
  title: 'Torneo',
  type: 'document',
  fields: [
    defineField({ name: 'lega', title: 'Lega', type: 'reference', to: [{ type: 'league' }], validation: (r) => r.required() }),
    defineField({ name: 'nome', title: 'Nome', type: 'string', validation: (r) => r.required().max(60) }),
    defineField({
      name: 'formato',
      title: 'Formato',
      type: 'string',
      initialValue: 'girone',
      options: {
        list: [
          { title: "Girone all'italiana", value: 'girone' },
          { title: 'Eliminazione diretta (tabellone)', value: 'eliminazione' },
          { title: 'Gironi + tabellone', value: 'gironi' },
        ],
      },
    }),
    defineField({ name: 'numGironi', title: 'Numero di gironi', type: 'number', hidden: ({ document }) => document?.formato !== 'gironi' }),
    defineField({
      name: 'qualificate',
      title: 'Squadre che passano da ogni girone',
      type: 'number',
      hidden: ({ document }) => document?.formato !== 'gironi',
    }),
    defineField({
      name: 'primoTurno',
      title: 'Primo turno del tabellone',
      description: 'I posti del tabellone in ordine (chiave della squadra, vuoto = passa direttamente chi è accanto)',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      hidden: ({ document }) => document?.formato === 'girone',
    }),
    defineField({
      name: 'calendario',
      title: 'Calendario',
      description: 'Per programmare i turni successivi del tabellone',
      type: 'object',
      fields: [
        defineField({ name: 'inizio', title: 'Prima giornata (ora italiana)', type: 'string' }),
        defineField({ name: 'ogniGiorni', title: 'Giorni tra un turno e l’altro', type: 'number' }),
        defineField({ name: 'durataMinuti', title: 'Durata partita (minuti)', type: 'number' }),
        defineField({ name: 'luogo', title: 'Campo / luogo', type: 'string' }),
      ],
    }),
    defineField({ name: 'andataRitorno', title: 'Andata e ritorno', type: 'boolean', initialValue: false }),
    defineField({ name: 'puntiVittoria', title: 'Punti per vittoria', type: 'number', initialValue: 3 }),
    defineField({ name: 'puntiPareggio', title: 'Punti per pareggio', type: 'number', initialValue: 1 }),
    defineField({
      name: 'squadre',
      title: 'Squadre',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'squadraTorneo',
          fields: [
            defineField({ name: 'nome', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'colore', type: 'string' }),
            defineField({ name: 'logo', title: 'Foto della squadra', type: 'image', options: { hotspot: true } }),
            defineField({ name: 'girone', title: 'Girone (A, B, …)', type: 'string' }),
            defineField({
              name: 'capitano',
              title: 'Capitano di squadra',
              description: 'Invita i compagni con il link della squadra, cambia nome e foto',
              type: 'reference',
              to: [{ type: 'player' }],
            }),
            defineField({ name: 'codiceInvito', title: 'Codice invito della squadra', type: 'string', readOnly: true }),
            defineField({ name: 'giocatori', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'player' }] })] }),
          ],
        }),
      ],
    }),
    defineField({ name: 'maxGiocatori', title: 'Giocatori massimi per squadra', description: 'Vuoto = nessun limite', type: 'number' }),
    defineField({
      name: 'iscrizioniChiuse',
      title: 'Iscrizioni chiuse',
      description: 'I capitani non possono più invitare né cambiare la squadra (si chiudono comunque alla prima partita)',
      type: 'boolean',
    }),
    defineField({ name: 'creatoDa', title: 'Creato da (Clerk user ID)', type: 'string', readOnly: true }),
  ],
  preview: { select: { title: 'nome', subtitle: 'lega.nome' } },
})
