import { Button } from "@animalesko/ui";
import { PawPrint } from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <PawPrint className="size-16 text-muted-foreground/40" />
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="text-lg font-medium">Esta página não existe por aqui</p>
      <p className="text-sm text-muted-foreground">
        O endereço que você abriu não faz parte do Animalesko Plus.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Voltar ao painel</Link>
      </Button>
    </main>
  );
}
