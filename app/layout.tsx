import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. これを追加！
import { GoogleAnalytics } from '@next/third-parties/google'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "お断りくん | 角が立たない断り文作成ツール",
  description: "あなたの代わりに、優しく「NO」を伝えます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
      {/* 2. bodyタグのすぐ下にこれを追加！ IDを自分のものに変えてね */}
      <GoogleAnalytics gaId="G-B434K2D0XE" /> 
    </html>
  );
}
