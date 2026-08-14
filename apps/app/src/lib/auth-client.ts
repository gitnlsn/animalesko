"use client";

import { createAnimaleskoAuthClient } from "@animalesko/auth/client";

export const authClient = createAnimaleskoAuthClient(
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
);

export const { signIn, signUp, signOut, useSession } = authClient;
