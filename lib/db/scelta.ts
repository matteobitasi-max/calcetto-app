// Dove stanno i dati: su Sanity (finora) o su Supabase. Si sceglie con la variabile DATI=supabase,
// così il passaggio (e l'eventuale ritorno) si fa cambiando una variabile su Vercel, senza toccare il codice.
export const usaSupabase = () => process.env.DATI === 'supabase'
