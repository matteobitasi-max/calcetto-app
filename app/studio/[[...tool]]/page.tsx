import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity.config'
import { usaSupabase } from '@/lib/db/scelta'

export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  // con i dati su Supabase lo Studio di Sanity mostrerebbe dati vecchi: si modificano dal pannello di Supabase
  if (usaSupabase()) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '15vh auto', padding: 24, lineHeight: 1.5 }}>
        <h1>I dati sono su Supabase</h1>
        <p>
          Lo Studio di Sanity non si usa più. Per modificare un dato a mano: pannello di Supabase → <b>Table Editor</b> → tabella{' '}
          <code>documenti</code> (colonna <code>doc</code>).
        </p>
      </main>
    )
  }
  return <NextStudio config={config} />
}
