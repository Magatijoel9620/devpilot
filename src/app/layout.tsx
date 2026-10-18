import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
export const metadata: Metadata = { title: 'DevPilot — Your work, under control', description: 'A calm command centre for projects, priorities, releases and focused work.', applicationName: 'DevPilot', manifest: '/manifest.webmanifest', icons: { icon: '/HG.png', apple: '/HG.png' }, appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'DevPilot' } };
export const viewport: Viewport = { themeColor: '#47856b', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en" suppressHydrationWarning><body><PwaRegister />{children}</body></html>; }
