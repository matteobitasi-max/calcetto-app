import 'server-only'
import { createClient, type SanityClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from '@/sanity/env'
import { archivioSupabase } from './db/supabase'
import { usaSupabase } from './db/scelta'

// L'archivio dei dati, privato: tutte le letture/scritture passano dal server.
// Su Sanity (dataset privato, col token) o su Supabase (lib/db/supabase.ts, stessa interfaccia),
// a seconda della variabile DATI (lib/db/scelta.ts).
const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

export const sanity: SanityClient = usaSupabase() ? (archivioSupabase as unknown as SanityClient) : sanityClient
