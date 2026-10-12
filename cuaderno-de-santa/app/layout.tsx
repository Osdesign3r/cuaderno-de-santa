import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fredoka';
import './globals.css';
import { RegistrarSW } from '@/components/RegistrarSW';
import { Starfield } from '@/components/Starfield';

export const metadata: Metadata = {
  title: 'El Cuaderno de Santa',
  description: 'El cuaderno donde Santa anota las buenas obras hasta Nochebuena.',
  applicationName: 'El Cuaderno de Santa',
  appleWebApp: { capable: true, title: 'Santa', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0a1030',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <Starfield />
        <RegistrarSW />
        <div className="mx-auto w-full max-w-md px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</div>
      </body>
    </html>
  );
}
