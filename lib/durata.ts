// "1 ora e mezza", "2 ore", "30 minuti": la durata di una prenotazione a parole.
export const nomeDurata = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h ? (h === 1 ? '1 ora' : `${h} ore`) : ''}${h && m ? ' e ' : ''}${m ? (h ? 'mezza' : '30 minuti') : ''}`
}
