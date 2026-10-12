import { defineArrayMember, defineField, defineType } from 'sanity'

const playerRefs = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [defineArrayMember({ type: 'reference', to: [{ type: 'player' }] })],
  })

export const match = defineType({
  name: 'match',
  title: 'Partita',
  type: 'document',
  fields: [
    defineField({ name: 'data', title: 'Data e ora', type: 'datetime', validation: (r) => r.required() }),
    defineField({ name: 'luogo', title: 'Campo / luogo', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'postiDisponibili',
      title: 'Posti disponibili',
      type: 'number',
      initialValue: 10,
      validation: (r) => r.required().min(2).integer(),
    }),
    defineField({ name: 'quota', title: 'Quota a testa (€)', type: 'number' }),
    defineField({
      name: 'stato',
      title: 'Stato',
      type: 'string',
      initialValue: 'aperta',
      options: { list: ['aperta', 'completa', 'giocata', 'annullata'], layout: 'radio' },
    }),
    defineField({ name: 'note', title: 'Note', type: 'text', rows: 3 }),
    defineField({
      name: 'convocazioni',
      title: 'Convocazioni',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'convocazione',
          fields: [
            defineField({ name: 'giocatore', type: 'reference', to: [{ type: 'player' }], validation: (r) => r.required() }),
            defineField({
              name: 'risposta',
              type: 'string',
              initialValue: 'in_attesa',
              options: { list: ['in_attesa', 'presente', 'assente', 'riserva'] },
            }),
            defineField({ name: 'rispostoIl', type: 'datetime' }),
          ],
          preview: {
            select: { title: 'giocatore.nome', subtitle: 'risposta' },
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
        defineField({ name: 'golA', title: 'Gol squadra A', type: 'number' }),
        defineField({ name: 'golB', title: 'Gol squadra B', type: 'number' }),
      ],
    }),
  ],
  orderings: [{ title: 'Data', name: 'dataDesc', by: [{ field: 'data', direction: 'desc' }] }],
  preview: {
    select: { data: 'data', luogo: 'luogo', stato: 'stato' },
    prepare: ({ data, luogo, stato }) => ({
      title: `${data ? new Date(data).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : 'Senza data'} · ${luogo ?? ''}`,
      subtitle: stato,
    }),
  },
})
