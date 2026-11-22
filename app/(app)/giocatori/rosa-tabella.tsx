import Link from 'next/link'
import { SKILLS, type Skill } from '@/lib/roster'
import { coloreVoto } from '@/components/ui'
import type { T } from '@/lib/i18n'
import type { Ordine, RigaRosa } from '@/lib/rosa-tabella'

// Computer: la rosa in tabella, ordinabile toccando le intestazioni. Sul telefono resta l'elenco.
export function RosaTabella({ righe, ordine, club, mioId, t }: { righe: RigaRosa[]; ordine: Ordine; club: boolean; mioId: string; t: T }) {
  const skills = Object.keys(SKILLS) as Skill[]
  const numero = (n: number) => t.numero(Math.round(n * 10) / 10)
  const th = (chiave: Ordine, etichetta: string, titolo?: string, allinea = 'text-right') => (
    <th className={`px-1.5 py-2 font-semibold ${allinea}`} title={titolo}>
      <Link href={`/giocatori?ordina=${chiave}`} scroll={false} replace className={`hover:text-green-700 dark:hover:text-green-400 ${ordine === chiave ? 'text-green-700 underline dark:text-green-400' : ''}`}>
        {etichetta}
      </Link>
    </th>
  )
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
          <tr>
            {th('numero', '#', t('Numero di maglia'))}
            {th('nome', t('Giocatore'), undefined, 'text-left')}
            {th('ruolo', t('Ruolo'), undefined, 'text-left')}
            {th('voto', t('Voto'))}
            {skills.map((k) => (
              <th key={k} className="px-1 py-2 text-center font-semibold" title={t(SKILLS[k])}>
                <Link href={`/giocatori?ordina=${k}`} scroll={false} replace className={`hover:text-green-700 ${ordine === k ? 'text-green-700 underline dark:text-green-400' : ''}`}>
                  {t(SKILLS[k]).slice(0, 3)}
                </Link>
              </th>
            ))}
            {th('partite', t('Pres.'), t('Partite giocate'))}
            {th('gol', '⚽', t('Gol'))}
            {th('mvp', '🫑', 'MVP')}
            {club && th('pagella', '📝', t('Media pagelle'))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {righe.map((r) => (
            <tr key={r.player._id} className={`tabular-nums hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${r.player._id === mioId ? 'font-bold' : ''}`}>
              <td className="px-1.5 py-2 text-right text-zinc-400">{r.numero ?? ''}</td>
              <td className="max-w-[12rem] truncate px-1.5 py-2">
                <Link href={`/giocatori/${r.player._id}`} className="hover:underline">
                  {r.nome}
                </Link>
                {r.fuori && <span className="ml-1" title={t('Indisponibile')}>🚑</span>}
              </td>
              <td className="px-1.5 py-2 text-xs capitalize text-zinc-500">{r.ruolo ?? ''}</td>
              <td className="px-1.5 py-2 text-right">
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${coloreVoto(r.voto)}`}>{numero(r.voto)}</span>
              </td>
              {skills.map((k) => (
                <td key={k} className="px-1 py-2 text-center text-xs text-zinc-600 dark:text-zinc-300">
                  {numero(r.skill[k])}
                </td>
              ))}
              <td className="px-1.5 py-2 text-right">{r.partite}</td>
              <td className="px-1.5 py-2 text-right">{r.gol}</td>
              <td className="px-1.5 py-2 text-right">{r.mvp}</td>
              {club && <td className="px-1.5 py-2 text-right">{r.pagella != null ? numero(r.pagella) : '–'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
