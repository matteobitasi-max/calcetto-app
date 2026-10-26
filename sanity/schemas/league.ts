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
      name: 'fotoSorprese',
      title: 'Foto sorpresa',
      description: 'Scuotendo il telefono ne compare una a caso, a tutto schermo',
      type: 'array',
      of: [{ type: 'image' }],
    }),
    // prima versione, con una sola foto: letta ancora insieme a fotoSorprese
    defineField({ name: 'fotoSorpresa', title: 'Foto sorpresa (vecchia)', type: 'image', hidden: true }),
    defineField({
      name: 'pro',
      title: 'Versione Pro',
      description: 'Forma dei giocatori e proposte automatiche di aggiornamento dei voti',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'citta',
      title: 'Città (per il meteo)',
      type: 'object',
      fields: [
        defineField({ name: 'nome', type: 'string' }),
        defineField({ name: 'lat', type: 'number' }),
        defineField({ name: 'lon', type: 'number' }),
      ],
    }),
    defineField({ name: 'creataDa', title: 'Creata da (Clerk user ID)', type: 'string', readOnly: true }),
  ],
  preview: {
    select: { title: 'nome', subtitle: 'codiceInvito', media: 'logo' },
  },
})
