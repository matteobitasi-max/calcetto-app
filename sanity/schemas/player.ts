import { defineField, defineType } from 'sanity'

const rating = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'number',
    initialValue: 5,
    validation: (r) => r.required().min(1).max(10).integer(),
  })

export const player = defineType({
  name: 'player',
  title: 'Giocatore',
  type: 'document',
  fields: [
    defineField({ name: 'nome', title: 'Nome', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'cognome', title: 'Cognome', type: 'string' }),
    defineField({ name: 'soprannome', title: 'Soprannome', type: 'string' }),
    defineField({
      name: 'email',
      title: 'Email',
      description: "Serve per collegare il giocatore all'account con cui fa login",
      type: 'string',
      validation: (r) => r.required().email(),
    }),
    defineField({ name: 'clerkUserId', title: 'Clerk user ID', type: 'string', readOnly: true }),
    defineField({ name: 'isAdmin', title: 'Organizzatore', type: 'boolean', initialValue: false }),
    defineField({ name: 'attivo', title: 'Attivo', type: 'boolean', initialValue: true }),
    defineField({ name: 'foto', title: 'Foto', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'ruolo',
      title: 'Ruolo preferito',
      type: 'string',
      options: {
        list: [
          { title: 'Portiere', value: 'portiere' },
          { title: 'Difensore', value: 'difensore' },
          { title: 'Centrocampista', value: 'centrocampista' },
          { title: 'Attaccante', value: 'attaccante' },
          { title: 'Jolly', value: 'jolly' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'piede',
      title: 'Piede',
      type: 'string',
      options: { list: ['destro', 'sinistro', 'ambidestro'], layout: 'radio' },
    }),
    defineField({
      name: 'caratteristiche',
      title: 'Caratteristiche (1-10)',
      type: 'object',
      options: { columns: 2 },
      fields: [
        rating('attacco', 'Attacco'),
        rating('difesa', 'Difesa'),
        rating('tecnica', 'Tecnica'),
        rating('velocita', 'Velocità'),
        rating('resistenza', 'Resistenza'),
        rating('porta', 'In porta'),
      ],
    }),
  ],
  preview: {
    select: { nome: 'nome', cognome: 'cognome', soprannome: 'soprannome', ruolo: 'ruolo', media: 'foto' },
    prepare: ({ nome, cognome, soprannome, ruolo, media }) => ({
      title: [nome, cognome].filter(Boolean).join(' ') + (soprannome ? ` "${soprannome}"` : ''),
      subtitle: ruolo,
      media,
    }),
  },
})
