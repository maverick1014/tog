import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '主恩堂 · 教会管理系统',
  description: '人 · 聚会 · 奉献 · 培训 · 四十天一对一守望',
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('tog-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
