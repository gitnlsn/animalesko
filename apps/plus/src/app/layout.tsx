import { Toaster } from "@animalesko/ui";
import { ThemeProvider } from "next-themes";

import { TRPCReactProvider } from "~/trpc/react.tsx";

import type { Metadata, Viewport } from "next";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Animalesko Plus — Painel do Prestador",
    template: "%s · Animalesko Plus",
  },
  description: "Gerencie seus serviços, sua agenda e a saúde dos pets que você atende.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
