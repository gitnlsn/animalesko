import { auth } from "@animalesko/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignInForm } from "~/components/sign-in-form.tsx";
import { safeNext } from "~/lib/safe-next.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in: send them on rather than showing a form they have no
  // reason to fill in — which is also what a back button onto `/entrar` after
  // signing in used to land on.
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect(safeNext(next));
  }

  // Scrubbed before it reaches the browser at all, not only inside the form.
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <SignInForm next={safeNext(next)} />
    </main>
  );
}
