"use client";

import { SignInForm } from "@animalesko/features/sign-in-form";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * A client component, unlike the web version.
 *
 * `searchParams` is a server-component prop, and a static export has no server
 * at request time — the `?next=` a gate redirects with only exists on the
 * device. `useSearchParams` needs a Suspense boundary to prerender at build
 * time, which is what the wrapper below is for.
 */
function SignIn() {
  const next = useSearchParams().get("next");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <SignInForm next={next ?? "/meus-pets"} />
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SignIn />
    </Suspense>
  );
}
