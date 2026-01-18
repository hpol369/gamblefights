import type { Metadata, Viewport } from 'next';
import { Cinzel } from 'next/font/google';
import './globals.css';
import { AppWalletProvider } from './components/AppWalletProvider';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';

const cinzel = Cinzel({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#8b0000',
};

export const metadata: Metadata = {
  title: 'GambleFights - Gladiatorial Combat on Solana',
  description: 'Provably fair 1v1 animated battle game. Wager SOL, watch your gladiator fight, and claim victory. Instant payouts, cryptographic fairness.',
  keywords: ['solana', 'betting', 'crypto', 'gambling', 'pvp', 'gladiator', 'wagering', 'provably fair'],
  authors: [{ name: 'GambleFights' }],
  creator: 'GambleFights',
  publisher: 'GambleFights',
  robots: 'index, follow',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gamblefights.io',
    siteName: 'GambleFights',
    title: 'GambleFights - Gladiatorial Combat on Solana',
    description: 'Wager SOL in provably fair 1v1 gladiator battles. Watch the fight unfold and claim your winnings instantly.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'GambleFights - Gladiatorial Combat Arena',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GambleFights - Gladiatorial Combat on Solana',
    description: 'Wager SOL in provably fair 1v1 gladiator battles. Instant payouts.',
    images: ['/og-image.svg'],
    creator: '@gamblefights',
  },
  metadataBase: new URL('https://gamblefights.io'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${cinzel.className} bg-sand text-stone-dark min-h-screen`}>
        <AppWalletProvider>
          <AuthProvider>
            <GameProvider>
              {children}
            </GameProvider>
          </AuthProvider>
        </AppWalletProvider>
      </body>
    </html>
  );
}
