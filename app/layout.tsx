import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FRAME / 白模导演台',
  description: '本地三维场景、摄影机与静态分镜预演。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
