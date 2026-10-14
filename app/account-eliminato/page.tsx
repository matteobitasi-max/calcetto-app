import Image from 'next/image'
import Link from 'next/link'

// Dopo "Elimina account": conferma che l'account non c'è più (pagina pubblica, senza accesso).
export default function AccountEliminatoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Image src="/icon-512.png" alt="" width={96} height={96} className="rounded-[22%] shadow-lg" priority />
      <div className="space-y-2">
        <p className="text-5xl">✅</p>
        <h1 className="text-2xl font-bold">Account eliminato con successo</h1>
        <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
          Abbiamo cancellato il tuo accesso, la tua foto e i tuoi dati personali in tutte le leghe. Grazie per aver giocato con The Cap!
        </p>
      </div>
      <Link href="/sign-in" className="w-full max-w-xs rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow hover:bg-green-700">
        Torna all&apos;inizio
      </Link>
    </main>
  )
}
