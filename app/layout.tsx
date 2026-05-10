// app/layout.tsx
import type React from "react";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { PWAUpdater } from "@/components/PWAUpdater";
import { sora } from "@/lib/fonts";
import QueryProvider from "@/components/providers/query-provider"; // <-- NOSSA IMPORTAÇÃO
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#009ed8" },
    { media: "(prefers-color-scheme: dark)", color: "#009ed8" },
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
    statusBarStyle: "black-translucent",
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
      <head>
        <script
          type="module"
          src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
        ></script>
      </head>

      <body
        className={`${sora.className} bg-background text-foreground antialiased`}
      >
        {/* ENVELOPANDO A APLICAÇÃO COM O NOVO CÉREBRO */}
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <WorkspaceProvider>
              <PWAUpdater />
              {children}
            </WorkspaceProvider>
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
