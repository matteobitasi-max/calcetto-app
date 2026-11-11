// Il motore che esegue le interrogazioni GROQ di groq-js 2.0.0 (licenza MIT, Sanity.io), copiato da
// node_modules/groq-js/dist (evaluator-*.js e shared-*.js) con una sola modifica, in evaluator.js:
// `a && b` e `a || b` si fermano al primo lato quando basta a decidere (false && …, true || …).
// L'originale calcola sempre entrambi i lati: con le sotto-interrogazioni dentro i filtri
// (es. lib/pro.ts) una lettura passava da pochi millisecondi a secondi. Il risultato è identico.
// L'analisi delle interrogazioni (parse) resta quella del pacchetto: produce solo dati semplici.
export { f as evaluate } from './evaluator.js'
