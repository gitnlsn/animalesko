import { auth } from "@animalesko/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Resolves the session or sends the visitor to sign in.
 *
 * Gating on the server means an anonymous visitor is redirected before any
 * markup is produced, rather than the prototype's pattern of rendering the
 * whole screen and then bouncing. `next` brings them back to the page they
 * asked for once they are in.
 */
export async function requireSession(next: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }

  return session;
}
