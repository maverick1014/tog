import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — makes the site installable ("添加到主屏幕" / Add to Home
 * Screen) as a standalone app with the 主恩堂 logo. Next serves this at
 * /manifest.webmanifest and injects the <link rel="manifest"> automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '主恩堂 · 教会管理系统',
    short_name: '主恩堂',
    description: '人 · 聚会 · 培训 · 四十天一对一守望',
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f3f2',
    theme_color: '#a51f24',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
