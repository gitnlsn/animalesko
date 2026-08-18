"use client";

import { SignInForm } from "./sign-in-form.tsx";

/**
 * Where signing in lands you when nothing sent you to `/entrar`.
 *
 * "Meus pets" rather than Início: someone who chose to sign in wants the part
 * of the app that needed an account, and the home feed is readable without one.
 */
export const DEFAULT_SIGNED_IN_ROUTE = "/meus-pets";

/**
 * Entrar.
 *
 * `next` is nullable because the two hosts read it differently — a server
 * `searchParams` prop on the web, `useSearchParams` in the static export, which
 * returns null rather than undefined for a missing key. Taking both and
 * applying the fallback here keeps the destination one decision instead of two.
 */
export function SignInScreen({ next }: { next?: string | null }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <SignInForm next={next ?? DEFAULT_SIGNED_IN_ROUTE} />
    </main>
  );
}
