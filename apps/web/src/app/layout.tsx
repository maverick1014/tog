import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: '主恩堂 · 教会管理系统',
  description: '人 · 聚会 · 培训 · 四十天一对一守望',
  manifest: '/manifest.webmanifest',
  applicationName: '主恩堂',
  appleWebApp: {
    capable: true,
    title: '主恩堂',
    statusBarStyle: 'default',
  },
  // Favicon (app/icon.png) and apple-touch-icon (app/apple-icon.png) are wired
  // automatically by Next's file conventions; PWA icons live in the manifest.
};

export const viewport: Viewport = {
  themeColor: '#a51f24',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
