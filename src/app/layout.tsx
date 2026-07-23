import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Poppins } from 'next/font/google'
import { AuthProvider } from '@/providers/AuthProvider'
import { ViewInsetsProvider } from '@/context/ViewInsetsProvider'

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ViewInsetsProvider>
                {children}
              </ViewInsetsProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
