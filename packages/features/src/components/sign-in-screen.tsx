"use client";

import { SignInForm } from "./sign-in-form.tsx";
import { safeNext } from "../lib/safe-next.ts";

export { DEFAULT_SIGNED_IN_ROUTE, safeNext } from "../lib/safe-next.ts";

/**
 * Entrar.
 *
 * `next` is nullable because the two hosts read it differently — a server
 * `searchParams` prop on the web, `useSearchParams` in the static export, which
 * returns null rather than undefined for a missing key. Taking both and
 * applying the fallback here keeps the destination one decision instead of two.
 *
 * `safeNext` is what stops that fallback being the only thing standing between
 * a crafted `?next=` and an off-site redirect.
 */
export function SignInScreen({ next }: { next?: string | null }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <SignInForm next={safeNext(next)} />
    </main>
  );
}
