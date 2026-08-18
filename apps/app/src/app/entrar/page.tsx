import { SignInScreen } from "@animalesko/features/sign-in-screen";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <SignInScreen next={next} />;
}
