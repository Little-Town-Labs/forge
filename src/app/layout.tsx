import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClerkProvider from "../components/ClerkProvider";
import { runStartupValidation } from "../utils/startup";

// Run startup validation when the application initializes
if (typeof window === 'undefined') {
  // Only run on server-side
  runStartupValidation({
    exitOnError: process.env.NODE_ENV === 'production',
    logLevel: 'info'
  });
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamic metadata base URL configuration
function getBaseUrl(): string {
  // Production: Use custom domain if set, otherwise Vercel URL
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Fallback for production without proper env vars
    return 'https://forge.yourdomain.com';
  }
  
  // Development: Use localhost
  return 'http://localhost:3000';
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    template: '%s | Forge',
    default: 'Forge - AI-Powered Knowledge Base Chat'
  },
  description: "Transform your knowledge base into an intelligent conversational experience. Forge combines advanced AI with semantic search to provide instant, contextual answers from your documentation and content.",
  keywords: [
    'AI chat',
    'knowledge base',
    'semantic search',
    'document AI',
    'conversational AI',
    'enterprise chat',
    'intelligent search',
    'AI assistant'
  ],
  authors: [{ name: 'Forge Team' }],
  creator: 'Forge',
  publisher: 'Forge',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Forge',
    title: 'Forge - AI-Powered Knowledge Base Chat',
    description: 'Transform your knowledge base into an intelligent conversational experience with advanced AI and semantic search.',
    url: 'https://forge.yourdomain.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Forge - AI-Powered Knowledge Base Chat',
      }
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forge - AI-Powered Knowledge Base Chat',
    description: 'Transform your knowledge base into an intelligent conversational experience with advanced AI and semantic search.',
    images: ['/og-image.png'],
    creator: '@forge',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
