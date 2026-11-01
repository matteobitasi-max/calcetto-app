// Quando usare il tema scuro (il campo di sera con i fari): se l'utente l'ha scelto, se il telefono
// è in modalità scura, oppure di sera, dal tramonto (circa, in Italia, secondo il mese) alle 7.
// È anche scritto come testo (SCRIPT_TEMA) per girare prima che la pagina si disegni, senza lampi chiari.
const TRAMONTO = [17, 18, 18.5, 20, 20.5, 21, 21, 20.5, 19.5, 18.5, 17, 17] // ore, gennaio → dicembre

export function temaScuro(adesso = new Date()) {
  let scelta: string | null = null
  try {
    scelta = localStorage.getItem('tema') // 'chiaro' | 'scuro' | null (automatico)
  } catch {}
  if (scelta === 'scuro') return true
  if (scelta === 'chiaro') return false
  const ora = adesso.getHours() + adesso.getMinutes() / 60
  const sera = ora >= TRAMONTO[adesso.getMonth()] || ora < 7
  return sera || window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const SCRIPT_TEMA = `(function(){try{var T=${JSON.stringify(TRAMONTO)};var d=new Date(),o=d.getHours()+d.getMinutes()/60,s=null;try{s=localStorage.getItem('tema')}catch(e){}var k=s==='scuro'||(s!=='chiaro'&&(o>=T[d.getMonth()]||o<7||matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.classList.toggle('dark',k)}catch(e){}})()`
