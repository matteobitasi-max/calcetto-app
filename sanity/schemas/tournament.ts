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
      options: { list: [{ title: "Girone all'italiana", value: 'girone' }] },
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
            defineField({ name: 'giocatori', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'player' }] })] }),
          ],
        }),
      ],
    }),
    defineField({ name: 'creatoDa', title: 'Creato da (Clerk user ID)', type: 'string', readOnly: true }),
  ],
  preview: { select: { title: 'nome', subtitle: 'lega.nome' } },
})
