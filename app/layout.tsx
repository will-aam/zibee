import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  themeColor: "#2563eb", // Cor da barra de status no mobile
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita que o usuário dê zoom sem querer no app
  viewportFit: "cover", // <--- O SEGREDO ESTÁ AQUI: Faz o app invadir a área do topo (Notch/Dynamic Island)
};

export const metadata: Metadata = {
  title: "Zibee",
  description:
    "Gerencie suas finanças pessoais, controle receitas, despesas e planeje suas metas financeiras",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    other: [
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    // "black-translucent" faz o iOS renderizar o site por trás da barra de status (texto branco)
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
      <body
        // Adicionado bg-background text-foreground para garantir as cores do tema baseadas na UI
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
