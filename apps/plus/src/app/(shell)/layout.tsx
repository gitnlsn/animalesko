import { auth } from "@animalesko/auth";
import { db } from "@animalesko/db";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@animalesko/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "~/components/app-header.tsx";
import { MobileNav, SidebarNav } from "~/components/sidebar-nav.tsx";
import { PlusProvider, type ActiveOrg } from "~/lib/org-context.tsx";
import { DEFAULT_SIGNED_IN_ROUTE, safeNext } from "~/lib/safe-next.ts";

/**
 * The provider chrome: header over a sidebar-and-content pair, `max-w-7xl`.
 *
 * Deliberately not the consumer app's `max-w-md` mobile shell — a provider
 * works at a desk, and the prototype's `Layout.tsx` was built the same way.
 *
 * The "no organization" guard lives here rather than on `/`, so every route
 * inherits it: a signed-in tutor who follows a link to `/agenda` gets the
 * explanation, not a FORBIDDEN from tRPC.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    // Carry the destination through the login form. Without it, a provider
    // opening a shared `/agenda?status=PENDING` link signed out arrived at the
    // dashboard instead, with no trace of where they had been going.
    const requested = safeNext(requestHeaders.get("x-pathname"));

    redirect(
      requested === DEFAULT_SIGNED_IN_ROUTE
        ? "/entrar"
        : `/entrar?next=${encodeURIComponent(requested)}`,
    );
  }

  const memberships = session.organizations ?? [];

  if (memberships.length === 0) {
    return <NoOrganization />;
  }

  const activeId = session.activeOrganizationId ?? memberships[0]!.id;

  // The session carries membership but not the organization's type, and the
  // navigation needs it to decide whether "Adoção" exists.
  const rows = await db.organization.findMany({
    where: { id: { in: memberships.map((membership) => membership.id) } },
    select: { id: true, type: true },
  });

  const typeById = new Map(rows.map((row) => [row.id, row.type]));

  const organizations: ActiveOrg[] = memberships.map((membership) => ({
    id: membership.id,
    slug: membership.slug,
    name: membership.name,
    role: membership.role,
    isShelter: typeById.get(membership.id) === "SHELTER",
  }));

  const org = organizations.find((candidate) => candidate.id === activeId) ?? organizations[0]!;

  return (
    <PlusProvider
      value={{
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        },
        org,
        organizations,
        // Read here so the token itself never reaches the browser — only the
        // one bit the UI branches on.
        uploadsEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      }}
    >
      <div className="min-h-dvh bg-background">
        <AppHeader />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <MobileNav />

          <div className="flex gap-6">
            <SidebarNav />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </div>
    </PlusProvider>
  );
}

function NoOrganization() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma organização vinculada</CardTitle>
          <CardDescription>
            O Animalesko Plus é o painel de quem presta serviços. Sua conta ainda não está vinculada
            a um abrigo, clínica, petshop ou perfil autônomo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}>
              Voltar para o Animalesko
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
