import { SignInForm } from "~/components/sign-in-form.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <SignInForm next={next ?? "/"} />
    </main>
  );
}
