import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppWalletProvider } from './components/AppWalletProvider';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GambleFights - Provably Fair Crypto Battles',
  description: 'Provably fair 1v1 animated battle game. Wager crypto and win big.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
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
