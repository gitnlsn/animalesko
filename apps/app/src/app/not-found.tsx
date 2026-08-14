import { Button } from "@animalesko/ui";
import { PawPrint } from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Página não encontrada" };

/**
 * 404.
 *
 * The prototype's version `console.error`'d the attempted path on every render
 * and offered a bare "Return to Home" link in English, in an otherwise
 * Portuguese app.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <PawPrint className="size-16 text-muted-foreground/40" />
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="text-lg font-medium">Esta página fugiu 🐾</p>
      <p className="text-sm text-muted-foreground">
        O endereço que você abriu não existe — ou o pet que estava aqui já encontrou uma família.
      </p>

      <div className="mt-2 flex gap-2">
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/adocao">Ver pets</Link>
        </Button>
      </div>
    </main>
  );
}
