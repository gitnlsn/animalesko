"use client";

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
import { useEffect, useState } from "react";

import { PageHeader } from "./page-header.tsx";

/**
 * Account verification.
 *
 * The prototype put a document-upload form here — identity, proof of address,
 * certificates — and base64'd the files into React state, where they went
 * nowhere. Verification is a real thing in this schema, but it belongs to an
 * *organization*: `ProviderVerification.orgId` is unique and there is no
 * user-level equivalent, because what gets verified is a business that takes
 * bookings, not a tutor who books them.
 *
 * So this explains the badge and routes anyone who wants one to `plus`, rather
 * than collecting documents the consumer app has nowhere to send. The upload
 * flow itself is a `plus` screen and belongs in that port.
 *
 * The session arrives as props rather than from `useSession`: this is the only
 * consumer screen that needs the e-mail and the organization list, which the
 * shared `ClientSession` deliberately does not carry. Each host reads its own
 * session — `requireSession` on the web, the Better Auth client on the device —
 * and hands over just these three values.
 */
export function VerificationScreen({
  email,
  isProvider,
  plusUrl,
}: {
  /** Undefined only on the native host, while the session is still resolving. */
  email: string | undefined;
  isProvider: boolean;
  plusUrl: string;
}) {
  const [openingPlus, setOpeningPlus] = useState(false);

  // Opening Plus hands off to another app and leaves this screen mounted, so
  // nothing here would ever clear the flag on its own. This window losing focus
  // *is* the handoff landing; the timeout covers the case where it never does,
  // so a blocked popup cannot leave the control permanently inert.
  useEffect(() => {
    if (!openingPlus) return;

    const clear = () => setOpeningPlus(false);
    const timer = setTimeout(clear, 4_000);
    window.addEventListener("blur", clear);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", clear);
    };
  }, [openingPlus]);

  return (
    <>
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
                <CardDescription>{email}</CardDescription>
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
            {/* Plus is a separate deployment, and on the device it is not part of
                the bundle at all — so this leaves the app either way, which is
                exactly why it needs a pending state: nothing on this screen
                changes while the browser is coming up. */}
            <Button asChild className="w-full" loading={openingPlus}>
              <a
                href={plusUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpeningPlus(true)}
              >
                <ExternalLink size={16} />
                {isProvider ? "Abrir o Animalesko Plus" : "Conhecer o Animalesko Plus"}
              </a>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas sobre verificação?{" "}
          <Link href="/suporte" className="underline press-feedback active:opacity-60">
            Fale com o suporte
          </Link>
          .
        </p>
      </main>
    </>
  );
}
