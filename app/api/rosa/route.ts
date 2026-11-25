import { requirePlayer } from '@/lib/player'
import { SKILLS, type Skill } from '@/lib/roster'
import { righeRosa } from '@/lib/rosa-tabella'
import { getT } from '@/lib/lingua'

// Esporta la rosa della lega attiva in CSV (si apre in Excel): solo per chi organizza.
export async function GET() {
  const me = await requirePlayer()
  if (!me.isAdmin) return new Response('Solo gli organizzatori', { status: 403 })
  const club = !!me.lega.club && me.lega.tipo === 'squadra'
  const [righe, t] = await Promise.all([righeRosa(me.lega._id, club, 'nome', me.lega.stagioni), getT()])
  const skills = Object.keys(SKILLS) as Skill[]
  const cella = (v: string | number | null | undefined) => {
    const s = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : v
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const intestazione = ['#', t('Nome'), t('Cognome'), t('Ruolo'), t('Voto'), ...skills.map((k) => t(SKILLS[k])), t('Partite giocate'), t('Gol'), 'MVP', ...(club ? [t('Media pagelle')] : []), t('Indisponibile'), 'Email', t('Telefono')]
  const linee = righe.map((r) =>
    [
      r.numero,
      r.player.nome,
      r.player.cognome,
      r.ruolo,
      r.voto,
      ...skills.map((k) => r.skill[k]),
      r.partite,
      r.gol,
      r.mvp,
      ...(club ? [r.pagella != null ? Math.round(r.pagella * 10) / 10 : null] : []),
      r.fuori ? t('Sì') : '',
      r.player.email,
      r.player.telefono,
    ]
      .map(cella)
      .join(';'),
  )
  // BOM: Excel riconosce gli accenti; il punto e virgola è il separatore che Excel usa in Italia
  const csv = '﻿' + [intestazione.map(cella).join(';'), ...linee].join('\r\n')
  const nome = `rosa-${me.lega.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lega'}.csv`
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nome}"`, 'Cache-Control': 'no-store' } })
}
