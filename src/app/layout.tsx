import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "El Dios Yerson - Sistema de Apuestas",
  description: "Sistema Premium de Apuestas Deportivas con IA. El Dios Yerson te guía en tus apuestas de bajo riesgo.",
  keywords: ["apuestas", "deportes", "fútbol", "betting", "El Dios Yerson", "apuestas deportivas"],
  authors: [{ name: "El Dios Yerson" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "El Dios Yerson - Sistema de Apuestas",
    description: "Sistema Premium de Apuestas Deportivas con IA",
    url: "https://dios-yerson-apuestas.vercel.app",
    siteName: "El Dios Yerson",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "El Dios Yerson - Sistema de Apuestas",
    description: "Sistema Premium de Apuestas Deportivas con IA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
