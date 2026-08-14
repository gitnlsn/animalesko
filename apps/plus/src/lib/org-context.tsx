"use client";

import { createContext, useContext } from "react";

import type { OrganizationMemberRole } from "@animalesko/db";

export interface ActiveOrg {
  id: string;
  slug: string;
  name: string;
  role: OrganizationMemberRole;
  /**
   * Only shelters publish animals for adoption, so this decides whether the
   * "Adoção" tab exists at all. Resolved in the shell layout rather than taken
   * from the session, which carries membership but not the organization's type.
   */
  isShelter: boolean;
}

export interface PlusContextValue {
  user: { id: string; name: string; email: string; image: string | null };
  org: ActiveOrg;
  /** Every organization the user belongs to, for the switcher. */
  organizations: ActiveOrg[];
  /**
   * Whether `BLOB_READ_WRITE_TOKEN` is set on the server.
   *
   * Read once in the shell layout rather than exposed as a `NEXT_PUBLIC_`
   * variable: the token itself must never reach the browser, and this is the
   * one bit of it the UI needs — whether to render a file picker or fall back
   * to a URL field.
   */
  uploadsEnabled: boolean;
}

const PlusContext = createContext<PlusContextValue | null>(null);

export function PlusProvider({
  value,
  children,
}: {
  value: PlusContextValue;
  children: React.ReactNode;
}) {
  return <PlusContext value={value}>{children}</PlusContext>;
}

/**
 * The active organization and who is acting for it.
 *
 * Throws rather than returning null: every client component under
 * `(shell)/layout.tsx` has a provider above it, so a missing one is a wiring
 * bug worth failing loudly on instead of rendering a half-empty screen.
 *
 * Nothing server-side trusts any of this — `providerProcedure` resolves the
 * organization from the session on every call.
 */
export function usePlus(): PlusContextValue {
  const value = useContext(PlusContext);

  if (!value) {
    throw new Error("usePlus deve ser usado dentro de PlusProvider.");
  }

  return value;
}

/** OWNER and ADMIN may change the business; STAFF runs the day-to-day. */
export function useCanAdminister(): boolean {
  const { org } = usePlus();
  return org.role === "OWNER" || org.role === "ADMIN";
}
