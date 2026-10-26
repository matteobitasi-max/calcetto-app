import { Suspense } from 'react'
import { scegliLingua } from '@/app/actions'
import { LINGUE, creaT, type Lingua } from '@/lib/i18n'
import { getLingua } from '@/lib/lingua'
import { SubmitButton } from '@/components/submit-button'
import { Card } from '@/components/ui'

// Primo accesso dopo il login (o un nuovo telefono): si sceglie la lingua dell'app.
// Il titolo è nelle due lingue, perché ancora non sappiamo quale si legge.
export default function LinguaPage({ searchParams }: PageProps<'/lingua'>) {
  return (
    <Suspense>
      <Scelta searchParams={searchParams} />
    </Suspense>
  )
}

async function Scelta({ searchParams }: { searchParams: PageProps<'/lingua'>['searchParams'] }) {
  const [{ dopo }, attuale] = await Promise.all([searchParams, getLingua()])
  const vai = typeof dopo === 'string' && dopo.startsWith('/') ? dopo : '/'
  return (
    <Card className="space-y-4 text-center">
      <h1 className="text-xl font-bold">
        Scegli la lingua
        <span className="block text-base font-normal text-zinc-500">Choose your language</span>
      </h1>
      <div className="grid gap-3">
        {(Object.keys(LINGUE) as Lingua[]).map((l) => (
          <form key={l} action={scegliLingua.bind(null, l, vai)}>
            <SubmitButton
              className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 px-4 py-4 text-lg font-semibold ${
                l === attuale ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span className="text-2xl">{LINGUE[l].bandiera}</span> {LINGUE[l].nome}
            </SubmitButton>
          </form>
        ))}
      </div>
      <p className="text-xs text-zinc-500">{creaT(attuale)('Puoi cambiarla quando vuoi dal tuo profilo.')}</p>
    </Card>
  )
}
