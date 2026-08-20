import { auth } from "@animalesko/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNext } from "@animalesko/features/safe-next";
import { SignInScreen } from "@animalesko/features/sign-in-screen";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in: show them the destination rather than a login form they
  // have no reason to fill in. This is also what makes the gates idempotent —
  // a back button onto `/entrar` after signing in used to strand the visitor on
  // a form, and following a stale `?next=` link now just goes there.
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect(safeNext(next));
  }

  // Scrubbed here too, not only inside `SignInScreen`: it keeps a crafted URL
  // out of the payload sent to the browser entirely, and this is the one host
  // that can decide before rendering anything.
  return <SignInScreen next={safeNext(next)} />;
}
