"use client";

import { createAnimaleskoAuthClient } from "@animalesko/auth/client";

export const authClient = createAnimaleskoAuthClient(
  process.env.NEXT_PUBLIC_PLUS_URL ?? "http://localhost:3001",
);

export const { signIn, signUp, signOut, useSession } = authClient;
