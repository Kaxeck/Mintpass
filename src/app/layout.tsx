import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Providers } from "@/providers";
import { MintpassProvider } from "@/store";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mintpass — NFT Ticketing on Solana",
  description: "Plataforma de boletos NFT sobre Solana. Crea eventos, vende entradas como NFTs y valida asistencia on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="app">
          <Providers>
            <MintpassProvider>
              {children}
            </MintpassProvider>
          </Providers>
        </div>
      </body>
    </html>
  );
}
