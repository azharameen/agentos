import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Nunito_Sans } from 'next/font/google';
import { UIStateProvider } from '@/context/ui-state-context';

const nunitoSans = Nunito_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Genie UI',
  description: 'A new standard for AI interaction.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn('min-h-screen bg-background font-sans antialiased', nunitoSans.variable)}>
        <UIStateProvider>
          {children}
        </UIStateProvider>
        <Toaster />
      </body>
    </html>
  );
}
