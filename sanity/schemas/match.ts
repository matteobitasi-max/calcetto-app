import { defineArrayMember, defineField, defineType } from 'sanity'

const STATI = [
  { title: 'Convocazioni aperte', value: 'aperta' },
  { title: 'Convocazioni chiuse', value: 'chiusa' },
  { title: 'Giocata', value: 'giocata' },
  { title: 'Annullata', value: 'annullata' },
]

const RISPOSTE = [
  { title: 'Presente', value: 'presente' },
  { title: 'Riserva', value: 'riserva' },
  { title: 'Assente', value: 'assente' },
]

const playerRefs = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    fieldset: 'squadre',
    of: [defineArrayMember({ type: 'reference', to: [{ type: 'player' }] })],
    validation: (r) => r.unique(),
  })

export const match = defineType({
  name: 'match',
  title: 'Partita',
  type: 'document',
  fieldsets: [
    { name: 'finestra', title: 'Finestra convocazioni', description: 'I giocatori possono convocarsi solo in questo intervallo', options: { columns: 2 } },
    { name: 'squadre', title: 'Squadre', options: { columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'lega',
      title: 'Lega',
      type: 'reference',
      to: [{ type: 'league' }],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'data', title: 'Data e ora della partita', type: 'datetime', validation: (r) => r.required() }),
    defineField({
      name: 'durataMinuti',
      title: 'Durata (minuti)',
      description: 'Il risultato si può inserire 1 minuto dopo la fine',
      type: 'number',
      initialValue: 60,
      validation: (r) => r.min(10).max(300).integer(),
    }),
    defineField({ name: 'luogo', title: 'Campo / luogo', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'postiDisponibili',
      title: 'Posti disponibili',
      description: 'Oltre questo numero chi si convoca finisce tra le riserve',
      type: 'number',
      initialValue: 10,
      validation: (r) => r.required().min(2).integer(),
    }),
    defineField({ name: 'quota', title: 'Quota a testa (€)', type: 'number', validation: (r) => r.min(0) }),
    defineField({ name: 'note', title: 'Note', type: 'text', rows: 3 }),
    defineField({
      name: 'serie',
      title: 'Partita ricorrente',
      description: 'Il modello da cui è stata generata questa partita',
      type: 'reference',
      to: [{ type: 'series' }],
      weak: true,
      readOnly: true,
    }),
    defineField({
      name: 'aperturaConvocazioni',
      title: 'Apertura',
      type: 'datetime',
      fieldset: 'finestra',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'chiusuraConvocazioni',
      title: 'Chiusura',
      type: 'datetime',
      fieldset: 'finestra',
      validation: (r) =>
        r.required().custom((value, ctx) => {
          const doc = ctx.document as { aperturaConvocazioni?: string; data?: string } | undefined
          if (!value || !doc) return true
          if (doc.aperturaConvocazioni && value <= doc.aperturaConvocazioni) return 'Deve essere dopo l’apertura'
          if (doc.data && value > doc.data) return 'Deve essere prima della partita'
          return true
        }),
    }),
    defineField({
      name: 'notificaInviataIl',
      title: 'Giocatori avvisati il',
      description: 'Ultimo invio della notifica "convocazioni aperte"',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'stato',
      title: 'Stato',
      type: 'string',
      initialValue: 'aperta',
      options: { list: STATI, layout: 'radio', direction: 'horizontal' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'convocazioni',
      title: 'Convocazioni',
      description: 'Le risposte dei giocatori, in ordine di arrivo',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'convocazione',
          fields: [
            defineField({ name: 'giocatore', type: 'reference', to: [{ type: 'player' }], validation: (r) => r.required() }),
            defineField({ name: 'risposta', type: 'string', initialValue: 'presente', options: { list: RISPOSTE } }),
            defineField({ name: 'rispostoIl', title: 'Risposto il', type: 'datetime' }),
            defineField({
              name: 'aggiunto',
              title: 'Aggiunto dall\u2019organizzatore',
              description: 'Preso dalla lista d\u2019attesa: resta in lista anche oltre il limite',
              type: 'boolean',
            }),
          ],
          preview: {
            select: { nome: 'giocatore.nome', cognome: 'giocatore.cognome', risposta: 'risposta', media: 'giocatore.foto' },
            prepare: ({ nome, cognome, risposta, media }) => ({
              title: [nome, cognome].filter(Boolean).join(' '),
              subtitle: RISPOSTE.find((r) => r.value === risposta)?.title,
              media,
            }),
          },
        }),
      ],
    }),
    playerRefs('squadraA', 'Squadra A'),
    playerRefs('squadraB', 'Squadra B'),
    defineField({
      name: 'risultato',
      title: 'Risultato',
      type: 'object',
      options: { columns: 2 },
      fields: [
        defineField({ name: 'golA', title: 'Gol squadra A', type: 'number', validation: (r) => r.min(0).integer() }),
        defineField({ name: 'golB', title: 'Gol squadra B', type: 'number', validation: (r) => r.min(0).integer() }),
      ],
    }),
    defineField({
      name: 'marcatori',
      title: 'Marcatori',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'marcatore',
          fields: [
            defineField({ name: 'giocatore', type: 'reference', to: [{ type: 'player' }], validation: (r) => r.required() }),
            defineField({ name: 'gol', type: 'number', initialValue: 1, validation: (r) => r.required().min(1).integer() }),
          ],
          preview: {
            select: { nome: 'giocatore.nome', cognome: 'giocatore.cognome', gol: 'gol', media: 'giocatore.foto' },
            prepare: ({ nome, cognome, gol, media }) => ({ title: [nome, cognome].filter(Boolean).join(' '), subtitle: `⚽ × ${gol}`, media }),
          },
        }),
      ],
    }),
    defineField({ name: 'autogolA', title: 'Autogol / altri gol squadra A', type: 'number', initialValue: 0, validation: (r) => r.min(0).integer() }),
    defineField({ name: 'autogolB', title: 'Autogol / altri gol squadra B', type: 'number', initialValue: 0, validation: (r) => r.min(0).integer() }),
    defineField({ name: 'mvp', title: 'MVP', type: 'reference', to: [{ type: 'player' }] }),
    defineField({
      name: 'pagamenti',
      title: 'Pagamenti quota',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'pagamento',
          fields: [
            defineField({ name: 'giocatore', type: 'reference', to: [{ type: 'player' }], validation: (r) => r.required() }),
            defineField({
              name: 'stato',
              type: 'string',
              options: {
                list: [
                  { title: 'Dichiarato dal giocatore', value: 'dichiarato' },
                  { title: "Confermato dall'organizzatore", value: 'confermato' },
                ],
              },
            }),
            defineField({ name: 'metodo', type: 'string', options: { list: ['satispay', 'contanti'] } }),
            defineField({ name: 'il', title: 'Data', type: 'datetime' }),
          ],
          preview: {
            select: { nome: 'giocatore.nome', stato: 'stato', metodo: 'metodo' },
            prepare: ({ nome, stato, metodo }) => ({ title: nome, subtitle: [stato, metodo].filter(Boolean).join(' · ') }),
          },
        }),
      ],
    }),
  ],
  orderings: [{ title: 'Data', name: 'dataDesc', by: [{ field: 'data', direction: 'desc' }] }],
  preview: {
    select: { data: 'data', luogo: 'luogo', stato: 'stato' },
    prepare: ({ data, luogo, stato }) => ({
      title: `${data ? new Date(data).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : 'Senza data'} · ${luogo ?? ''}`,
      subtitle: STATI.find((s) => s.value === stato)?.title,
    }),
  },
})
