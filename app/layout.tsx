import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { IndietroAndroid } from "@/components/indietro-android";
import { SwipeIndietro } from "@/components/swipe-indietro";
import { RitornoAccesso } from "@/components/accesso-nativo";
import { SenzaConnessione } from "@/components/senza-connessione";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// viewport-fit=cover: nell'app iPhone il contenuto arriva fino ai bordi (notch, barra in basso),
// e le zone sicure vengono rispettate con env(safe-area-inset-*).
export const viewport: Viewport = {
  viewportFit: "cover",
  // Niente zoom automatico quando si tocca un campo (Safari permette comunque lo zoom con due dita).
  maximumScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "TheCap",
  description: "Convocazioni per le partite di calcetto",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        options: {
          // Niente scritta "Development mode" nella schermata di accesso (chiavi Clerk di sviluppo).
          unsafe_disableDevelopmentModeWarnings: true,
          privacyPageUrl: "/privacy",
          helpPageUrl: "/supporto",
        },
      }}
    >
      <html
        lang="it"
        // L'app Android (Capacitor) aggiunge qui le misure delle zone sicure prima dell'avvio
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <IndietroAndroid />
          <SwipeIndietro />
          <RitornoAccesso />
          <SenzaConnessione />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
