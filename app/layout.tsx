// app/layout.tsx
import type React from "react";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { PWAUpdater } from "@/components/PWAUpdater";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.55 0.18 230)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.65 0.15 230)" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Zibee",
  description: "Gerencie suas finanças pessoais",
  // ESTRATÉGIA DE CACHE BUSTING: Adicionado ?v=2
  manifest: "/manifest.json?v=2",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon-16x16.png?v=2", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zibee",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WorkspaceProvider>
            {/* INJETANDO O MONITOR DE ATUALIZAÇÃO DO PWA */}
            <PWAUpdater />
            {children}
          </WorkspaceProvider>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
