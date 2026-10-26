/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli'

// L'app nativa mostra il sito pubblicato. L'indirizzo viene scritto nei progetti
// iOS/Android a ogni `npx cap sync`. Di base è il sito online, così le build per gli
// store non puntano mai per errore a un server locale. Solo per lo sviluppo:
//   simulatore iPhone:  npm run dev  +  npm run app:ios       (→ localhost)
//   emulatore Android:  npm run dev  +  npm run app:android   (→ 10.0.2.2)
//   prima di una build per gli store:  npm run app:online
const url = process.env.CAP_SERVER_URL ?? 'https://calcetto-app-brown.vercel.app'

const config: CapacitorConfig = {
  appId: 'com.matteobitasi.thecap',
  appName: 'TheCap',
  // Pagina mostrata solo se il sito non è raggiungibile.
  webDir: 'capacitor/www',
  server: {
    url,
    // senza internet il sito non si carica: si mostra questa pagina salvata nell'app
    errorPath: 'offline.html',
    cleartext: url.startsWith('http://'),
    // Il login di Clerk passa dai suoi domini: devono restare dentro l'app,
    // altrimenti vengono aperti nel browser esterno e la sessione si perde.
    allowNavigation: ['*.accounts.dev', '*.clerk.accounts.dev', 'clerk.*', 'accounts.*'],
  },
  ios: {
    contentInset: 'never',
  },
  // Evita un conflitto di nomi tra pacchetti Swift (vedi documentazione del plugin Firebase).
  experimental: {
    ios: { spm: { packageOptions: { '@capacitor-firebase/messaging': { symlink: true } } } },
  },
  plugins: {
    // Notifiche native (Firebase Cloud Messaging), mostrate anche con l'app aperta.
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
    StatusBar: {
      // testo scuro su intestazione chiara, adattato al tema del telefono
      style: 'DEFAULT',
    },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#008538',
      showSpinner: false,
    },
  },
}

export default config
