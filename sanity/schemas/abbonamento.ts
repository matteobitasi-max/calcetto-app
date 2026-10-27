import { defineField, defineType } from 'sanity'

// Abbonamento Pro di un utente (vale in tutte le sue leghe). Chi ce l'ha mostra la "C" del logo accanto al nome,
// e le leghe in cui è organizzatore hanno le funzioni Pro.
export const abbonamento = defineType({
  name: 'abbonamento',
  title: 'Abbonamenti Pro',
  type: 'document',
  fields: [
    defineField({ name: 'clerkUserId', title: 'Utente (Clerk user ID)', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'email', title: 'Email (per riconoscerlo)', type: 'string' }),
    defineField({ name: 'attivo', title: 'Attivo', type: 'boolean', initialValue: true }),
    defineField({ name: 'dal', title: 'Attivo dal', type: 'datetime' }),
    defineField({ name: 'scadenza', title: 'Scade il', description: 'Vuoto = senza scadenza', type: 'datetime' }),
    // Abbonamenti pagati nelle app: li scrive il server da RevenueCat (non modificarli a mano).
    defineField({ name: 'store', title: 'Store', type: 'string', readOnly: true, description: 'APP_STORE / PLAY_STORE: pagato nell\u2019app' }),
    defineField({ name: 'prodotto', title: 'Prodotto', type: 'string', readOnly: true }),
    defineField({ name: 'rinnovo', title: 'Rinnovo automatico', type: 'boolean', readOnly: true }),
  ],
  preview: {
    select: { email: 'email', attivo: 'attivo', scadenza: 'scadenza' },
    prepare: ({ email, attivo, scadenza }) => ({
      title: email ?? 'Abbonamento Pro',
      subtitle: [attivo === false ? 'non attivo' : 'attivo', scadenza && `fino al ${String(scadenza).slice(0, 10)}`].filter(Boolean).join(' · '),
    }),
  },
})
