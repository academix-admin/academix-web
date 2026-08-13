import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Poppins } from 'next/font/google'
import { AuthProvider } from '@/providers/AuthProvider'
import { ViewportInsetsProvider } from '@academix-admin/navigation-stack'
import { AppLock } from '@/components/AppLock'
import { NavigationDevtools } from "@academix-admin/navigation-stack";

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
              <AppLock>
                <ViewportInsetsProvider>
                  {children}
                  {/*
                    Navigation devtools. Renders null in production builds (the dev branch is
                    stripped at build time via process.env.NODE_ENV), so this is safe to leave
                    mounted permanently rather than guarding it here. Alt+N toggles the panel.
                    Playwright forces it on against prod builds via window.__NAV_STACK_DEVTOOLS__.
                  */}
                  <NavigationDevtools />
                </ViewportInsetsProvider>
              </AppLock>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
