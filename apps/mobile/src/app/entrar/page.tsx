"use client";

import { SignInScreen } from "@animalesko/features/sign-in-screen";
import { Card, CardContent, CardHeader, Skeleton } from "@animalesko/ui";
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

/**
 * Shaped like the card it is standing in for, down to the vertical centring.
 *
 * Every gate redirect lands here, so this is what a signed-out user sees the
 * instant they tap a protected screen — a blank viewport read as the app having
 * lost its place.
 */
function SignInFallback() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="mx-auto h-10 w-52 rounded-lg" />
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignIn />
    </Suspense>
  );
}
