/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli'

// L'app nativa mostra il sito pubblicato. L'indirizzo viene scritto nei progetti
// iOS/Android a ogni `npx cap sync`, quindi va impostato prima:
//   in sviluppo:  npm run dev  +  npx cap sync           (simulatore iPhone → localhost)
//   emulatore Android in sviluppo:  CAP_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
//   produzione:  npm run app:online   (https://calcetto-app-brown.vercel.app)
const url = process.env.CAP_SERVER_URL ?? 'http://localhost:3000'

const config: CapacitorConfig = {
  appId: 'com.matteobitasi.thecap',
  appName: 'Calcetto',
  // Pagina mostrata solo se il sito non è raggiungibile.
  webDir: 'capacitor/www',
  server: {
    url,
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
      backgroundColor: '#1c8532',
      showSpinner: false,
    },
  },
}

export default config
