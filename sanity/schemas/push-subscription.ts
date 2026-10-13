import { defineField, defineType } from 'sanity'

// Un dispositivo su cui un giocatore ha attivato le notifiche. Creato dall'app.
export const pushSubscription = defineType({
  name: 'pushSubscription',
  title: 'Notifiche attive',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({ name: 'clerkUserId', title: 'Utente (Clerk user ID)', type: 'string' }),
    defineField({ name: 'giocatore', type: 'reference', to: [{ type: 'player' }], weak: true }),
    defineField({
      name: 'tipo',
      description: 'web = notifiche del browser; ios/android = app native (token APNs/FCM)',
      type: 'string',
      options: { list: ['web', 'ios', 'android'] },
      initialValue: 'web',
    }),
    defineField({ name: 'endpoint', type: 'url' }),
    defineField({ name: 'token', title: 'Token Firebase (app native)', type: 'string' }),
    defineField({
      name: 'keys',
      type: 'object',
      fields: [defineField({ name: 'p256dh', type: 'string' }), defineField({ name: 'auth', type: 'string' })],
    }),
    defineField({ name: 'dispositivo', type: 'string' }),
  ],
  preview: {
    select: { tipo: 'tipo', nome: 'giocatore.nome', cognome: 'giocatore.cognome', dispositivo: 'dispositivo', media: 'giocatore.foto' },
    prepare: ({ tipo, nome, cognome, dispositivo, media }) => ({
      title: [nome, cognome].filter(Boolean).join(' ') || 'Giocatore rimosso',
      subtitle: [tipo, dispositivo].filter(Boolean).join(' · '),
      media,
    }),
  },
})
