import { Toaster } from "@animalesko/ui";
import { ThemeProvider } from "next-themes";

import { MobileProviders } from "~/trpc/react.tsx";

import type { Metadata, Viewport } from "next";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Animalesko",
    template: "%s · Animalesko",
  },
  description: "Adote pets e agende serviços especializados para seu companheiro.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],

  // A WebView will otherwise let a double-tap zoom the whole app, which reads
  // as a bug rather than a gesture. `viewportFit: cover` is what puts the
  // layout under the notch so `env(safe-area-inset-*)` has something to report
  // — the bottom nav already relies on it.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <MobileProviders>{children}</MobileProviders>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
