import { Toaster } from "@animalesko/ui";
import { ThemeProvider } from "next-themes";

import { TRPCReactProvider } from "~/trpc/react.tsx";

import type { Metadata, Viewport } from "next";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Animalesko — Adoção de Pets e Serviços Pet",
    template: "%s · Animalesko",
  },
  description:
    "Encontre seu novo melhor amigo na Animalesko. Adote pets e agende serviços especializados para seu companheiro.",
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
