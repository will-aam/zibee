// app/layout.tsx
import type React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// Configurei as variáveis para o Tailwind reconhecer as fontes corretamente
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Configuração de Viewport (importante para o tema do navegador no celular)
export const viewport: Viewport = {
  themeColor: "#09090b", // Cor escura do seu tema (bg-background)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Zibee",
  description:
    "Gerencie suas finanças pessoais, controle receitas, despesas e planeje suas metas financeiras",

  // Apontando para o arquivo manifest que você já tem na pasta public
  // Isso é OBRIGATÓRIO para aparecer o botão de instalar no Android/Chrome
  manifest: "/manifest.json",
  // Mapeando os ícones que aparecem na sua imagem
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" }, // Geralmente o icon.png é 192x192 ou 512x512
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    // Ícone específico para Android (atalho na tela inicial)
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
    // <--- 2. IMPORTANTE: Remova a classe "dark" da tag HTML e adicione suppressHydrationWarning
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* <--- 3. IMPORTANTE: Adicione o ThemeProvider envolvendo os children */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system" // Começa com o tema do sistema do usuário
          enableSystem // Permite que o usuário escolha "system"
          disableTransitionOnChange // Evita animações estranhas ao mudar o tema
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
