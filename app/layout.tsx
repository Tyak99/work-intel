import './globals.css';
import type { Metadata } from 'next';
import { Inter, Rajdhani, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani'
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono'
});

export const metadata: Metadata = {
  title: 'Work Intel | Engineering Team Intelligence',
  description: 'AI-powered weekly team reports from your GitHub activity. See what shipped, what\'s stuck, and what needs attention.',
  openGraph: {
    title: 'Work Intel | Engineering Team Intelligence',
    description: 'AI-powered weekly team reports from your GitHub activity. See what shipped, what\'s stuck, and what needs attention.',
    type: 'website',
    siteName: 'Work Intel',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work Intel | Engineering Team Intelligence',
    description: 'AI-powered weekly team reports from your GitHub activity. See what shipped, what\'s stuck, and what needs attention.',
  },
};

// Script to prevent theme flash - runs before React hydrates
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('work-intel-theme') || 'original';
      var root = document.documentElement;
      root.classList.add('theme-' + theme);
      if (theme === 'future') {
        root.classList.add('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${rajdhani.variable} ${jetbrainsMono.variable} font-sans bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
                backdropFilter: 'blur(10px)',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(var(--status-success))',
                  secondary: 'hsl(var(--card))',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'hsl(var(--card))',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
