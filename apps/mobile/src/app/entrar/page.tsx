"use client";

import { SignInScreen } from "@animalesko/features/sign-in-screen";
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

  return <SignInScreen next={next} />;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SignIn />
    </Suspense>
  );
}
