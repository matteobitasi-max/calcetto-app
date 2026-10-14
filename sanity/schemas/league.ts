import { defineField, defineType } from 'sanity'

// Una lega è un gruppo di calcetto: rosa, partite e statistiche sono separate per lega.
export const league = defineType({
  name: 'league',
  title: 'Lega',
  type: 'document',
  fields: [
    defineField({ name: 'nome', title: 'Nome', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'logo', title: 'Logo', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'codiceInvito',
      title: 'Codice invito',
      description: 'Chi ha il link /invito/<codice> entra nella lega. Cambialo per invalidare i link già inviati.',
      type: 'string',
      validation: (r) => r.required().regex(/^[A-Z0-9]{6}$/, { name: 'codice di 6 caratteri' }),
    }),
    defineField({
      name: 'satispayLink',
      title: 'Link Satispay',
      description: "Dove i giocatori pagano la quota (letto anche dal QR dell'organizzatore)",
      type: 'url',
      validation: (r) => r.uri({ scheme: ['https'] }),
    }),
    defineField({ name: 'satispayQr', title: 'QR Satispay', description: 'Da mostrare al campo', type: 'image' }),
    defineField({
      name: 'fotoSorpresa',
      title: 'Foto sorpresa',
      description: 'Compare a tutto schermo quando un giocatore scuote il telefono',
      type: 'image',
    }),
    defineField({ name: 'creataDa', title: 'Creata da (Clerk user ID)', type: 'string', readOnly: true }),
  ],
  preview: {
    select: { title: 'nome', subtitle: 'codiceInvito', media: 'logo' },
  },
})
