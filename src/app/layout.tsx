import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Poppins } from 'next/font/google'
import { AuthProvider } from '@/providers/AuthProvider'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // Add more if needed
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Academix',
  description: 'Gamified educational quiz platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
