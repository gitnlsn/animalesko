"use client";

import { PageHeader } from "@animalesko/features/page-header";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@animalesko/ui";
import { BadgeCheck, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Gated } from "~/components/gated.tsx";
import { authClient } from "~/lib/auth-client.ts";

/**
 * What the verified badge means, and where to get one.
 *
 * Reads the full session rather than the `{signedIn, userId, name}` context the
 * shared components use, because it needs the e-mail and the organization list.
 * Verification belongs to an organization — `ProviderVerification.orgId` is
 * unique and there is no user-level equivalent — so this explains the badge and
 * routes anyone who wants one to Plus, which stays a web app.
 */
export default function VerificationPage() {
  const session = authClient.useSession();

  const organizations = session.data?.organizations ?? [];
  const isProvider = organizations.length > 0;
  const plusUrl = process.env.NEXT_PUBLIC_PLUS_URL ?? "https://plus.animalesko.com";

  return (
    <Gated next="/verificacao">
      <PageHeader
        title="Verificação de conta"
        subtitle="O selo azul da Animalesko"
        backTo="/perfil"
      />

      <main className="mx-auto max-w-md space-y-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck size={18} className="text-primary" />
                  Sua conta
                </CardTitle>
                <CardDescription>{session.data?.user.email}</CardDescription>
              </div>
              <Badge variant="muted">Tutor</Badge>
            </div>
          </CardHeader>

          <CardContent className="text-sm text-muted-foreground">
            Contas de tutor não passam por verificação — você não precisa de nada para adotar,
            agendar ou usar o Pet Alert.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck size={18} className="text-primary" />O que significa o selo
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              O selo azul ao lado do nome de um prestador quer dizer que a Animalesko conferiu os
              documentos daquele negócio: identidade do responsável, comprovante de endereço e,
              quando aplicável, registro profissional.
            </p>
            <p>
              Ele é da <strong>organização</strong>, não da pessoa — é o abrigo, a clínica ou o
              petshop que é verificado, porque é quem responde pelo serviço prestado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText size={18} className="text-secondary" />
              Quer prestar serviços?
            </CardTitle>
            <CardDescription>
              {isProvider
                ? "Sua conta já está vinculada a uma organização."
                : "Prestadores usam o Animalesko Plus para publicar serviços e enviar documentos."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button asChild className="w-full">
              <a href={plusUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                {isProvider ? "Abrir o Animalesko Plus" : "Conhecer o Animalesko Plus"}
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas sobre verificação?{" "}
          <Link href="/suporte" className="underline">
            Fale com o suporte
          </Link>
          .
        </p>
      </main>
    </Gated>
  );
}
