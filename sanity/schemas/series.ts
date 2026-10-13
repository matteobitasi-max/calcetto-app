import { defineArrayMember, defineField, defineType } from 'sanity'
import { MAX_GIOCATORI } from '../../lib/limiti'

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/

// Modello da cui vengono generate automaticamente le partite di ogni settimana.
export const series = defineType({
  name: 'series',
  title: 'Partita ricorrente',
  type: 'document',
  fieldsets: [
    { name: 'quando', title: 'Quando', options: { columns: 2 } },
    { name: 'apertura', title: 'Apertura convocazioni', options: { columns: 2 } },
    { name: 'chiusura', title: 'Chiusura convocazioni', options: { columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'lega',
      title: 'Lega',
      type: 'reference',
      to: [{ type: 'league' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'attiva',
      title: 'Attiva',
      description: 'Se disattivata non vengono più create nuove partite',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'primaData',
      title: 'Prima partita',
      description: 'Stabilisce anche il giorno della settimana',
      type: 'date',
      fieldset: 'quando',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'ora',
      title: 'Ora (HH:MM)',
      type: 'string',
      fieldset: 'quando',
      initialValue: '20:30',
      validation: (r) => r.required().regex(ORA, { name: 'ora' }),
    }),
    defineField({
      name: 'ogniSettimane',
      title: 'Ripeti ogni',
      type: 'number',
      fieldset: 'quando',
      initialValue: 1,
      options: {
        list: [
          { title: 'Ogni settimana', value: 1 },
          { title: 'Ogni 2 settimane', value: 2 },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'fineData', title: 'Fino al (facoltativo)', type: 'date', fieldset: 'quando' }),
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
      title: 'Giocatori in lista',
      type: 'number',
      initialValue: 10,
      validation: (r) => r.required().min(2).max(MAX_GIOCATORI).integer(),
    }),
    defineField({ name: 'quota', title: 'Quota a testa (€)', type: 'number', validation: (r) => r.min(0) }),
    defineField({ name: 'note', title: 'Note', type: 'text', rows: 3 }),
    defineField({
      name: 'aperturaGiorniPrima',
      title: 'Giorni prima',
      type: 'number',
      fieldset: 'apertura',
      initialValue: 3,
      validation: (r) => r.required().min(0).integer(),
    }),
    defineField({
      name: 'aperturaOra',
      title: 'Alle (HH:MM)',
      type: 'string',
      fieldset: 'apertura',
      initialValue: '09:00',
      validation: (r) => r.required().regex(ORA, { name: 'ora' }),
    }),
    defineField({
      name: 'chiusuraGiorniPrima',
      title: 'Giorni prima',
      type: 'number',
      fieldset: 'chiusura',
      initialValue: 0,
      validation: (r) => r.required().min(0).integer(),
    }),
    defineField({
      name: 'chiusuraOra',
      title: 'Alle (HH:MM)',
      type: 'string',
      fieldset: 'chiusura',
      initialValue: '12:00',
      validation: (r) => r.required().regex(ORA, { name: 'ora' }),
    }),
    defineField({
      name: 'esclusi',
      title: 'Date saltate',
      description: 'Giorni in cui la partita non viene creata (es. eliminata a mano)',
      type: 'array',
      of: [defineArrayMember({ type: 'date' })],
    }),
  ],
  preview: {
    select: { primaData: 'primaData', ora: 'ora', luogo: 'luogo', attiva: 'attiva', ogni: 'ogniSettimane' },
    prepare: ({ primaData, ora, luogo, attiva, ogni }) => ({
      title: `${primaData ? new Date(`${primaData}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'long', timeZone: 'UTC' }) : '?'} ${ora ?? ''} · ${luogo ?? ''}`,
      subtitle: [ogni === 2 ? 'ogni 2 settimane' : 'ogni settimana', attiva === false && 'interrotta'].filter(Boolean).join(' · '),
    }),
  },
})
