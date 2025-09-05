import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // Add more if needed
  variable: '--font-poppins',
  display: 'swap',
})

export default function SecondaryLayout({ children }: { children: React.ReactNode }) {
  return (
      <div>
        {children}
      </div>
  );
}
