import { defineField, defineType } from 'sanity'
import { SKILLS, SKILL_DESCRIPTIONS, RUOLI, PIEDI } from '../../lib/roster'

const rating = (name: keyof typeof SKILLS) =>
  defineField({
    name,
    title: SKILLS[name],
    description: SKILL_DESCRIPTIONS[name],
    type: 'number',
    initialValue: 5,
    validation: (r) => r.required().min(1).max(10).integer(),
  })

export const player = defineType({
  name: 'player',
  title: 'Giocatore',
  type: 'document',
  fieldsets: [
    { name: 'anagrafica', title: 'Anagrafica', options: { columns: 2 } },
    { name: 'accesso', title: 'Accesso all’app', options: { collapsible: true, collapsed: true } },
    { name: 'gioco', title: 'In campo', options: { columns: 2 } },
  ],
  fields: [
    defineField({ name: 'nome', title: 'Nome', type: 'string', fieldset: 'anagrafica', validation: (r) => r.required() }),
    defineField({ name: 'cognome', title: 'Cognome', type: 'string', fieldset: 'anagrafica' }),
    defineField({ name: 'soprannome', title: 'Soprannome', type: 'string', description: 'Se presente, viene mostrato al posto del nome' }),
    defineField({ name: 'foto', title: 'Foto profilo', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'email',
      title: 'Email',
      description: "Serve per collegare il giocatore all'account con cui fa login",
      type: 'string',
      fieldset: 'accesso',
      validation: (r) => r.required().email(),
    }),
    defineField({ name: 'clerkUserId', title: 'Clerk user ID', type: 'string', fieldset: 'accesso', readOnly: true }),
    defineField({
      name: 'isAdmin',
      title: 'Organizzatore',
      description: 'Gestisce partite, convocazioni, squadre e rosa',
      type: 'boolean',
      fieldset: 'accesso',
      initialValue: false,
    }),
    defineField({
      name: 'puoModificareGiocatori',
      title: 'Può modificare caratteristiche e foto',
      description: 'Può cambiare i valori e la foto di tutti i giocatori, ma non il resto',
      type: 'boolean',
      fieldset: 'accesso',
      initialValue: false,
    }),
    defineField({
      name: 'puoInserireRisultati',
      title: 'Può inserire i risultati',
      description: 'Può segnare risultato, marcatori e MVP a fine partita',
      type: 'boolean',
      fieldset: 'accesso',
      initialValue: false,
    }),
    defineField({
      name: 'attivo',
      title: 'Attivo',
      description: 'I giocatori non attivi non vedono le partite e non possono convocarsi',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'ruolo',
      title: 'Ruolo preferito',
      type: 'string',
      fieldset: 'gioco',
      options: { list: RUOLI.map((r) => ({ title: r[0].toUpperCase() + r.slice(1), value: r })) },
    }),
    defineField({
      name: 'piede',
      title: 'Piede',
      type: 'string',
      fieldset: 'gioco',
      options: { list: PIEDI.map((p) => ({ title: p[0].toUpperCase() + p.slice(1), value: p })) },
    }),
    defineField({
      name: 'caratteristiche',
      title: 'Caratteristiche (1-10)',
      description: 'Usate per bilanciare le squadre',
      type: 'object',
      options: { columns: 2 },
      validation: (r) => r.required(),
      fields: (Object.keys(SKILLS) as (keyof typeof SKILLS)[]).map(rating),
    }),
  ],
  orderings: [{ title: 'Nome', name: 'nomeAsc', by: [{ field: 'nome', direction: 'asc' }] }],
  preview: {
    select: { nome: 'nome', cognome: 'cognome', soprannome: 'soprannome', ruolo: 'ruolo', attivo: 'attivo', media: 'foto' },
    prepare: ({ nome, cognome, soprannome, ruolo, attivo, media }) => ({
      title: [nome, cognome].filter(Boolean).join(' ') + (soprannome ? ` "${soprannome}"` : ''),
      subtitle: [ruolo, attivo === false && 'non attivo'].filter(Boolean).join(' · '),
      media,
    }),
  },
})
