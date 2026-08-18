/**
 * The shape of the "faça parte" form, shared by the client component and the
 * server action.
 *
 * Two constraints meet in this file, and both of them are about what it must
 * NOT import.
 *
 * A `"use server"` module may only export async functions — every other export
 * becomes a callable endpoint — so the categories and the initial state cannot
 * live next to the action.
 *
 * And this module is imported by a client component, so anything it pulls in is
 * downloaded by every visitor. Keeping the Zod schema here was measurably
 * wrong: it put the whole of Zod (~280 kB unminified) into the browser bundle
 * of a page whose only interactive element is three inputs. The schema lives in
 * the action instead, where validation actually happens.
 *
 * Keep this file dependency-free.
 */

export const LEAD_CATEGORIES = ["Amigos de pet", "Serviços para pets", "ONG de animais"] as const;

export type LeadCategory = (typeof LEAD_CATEGORIES)[number];

export type LeadFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Field-level messages, keyed by input name. */
  errors?: Partial<Record<"name" | "email" | "category", string>>;
};

export const initialLeadState: LeadFormState = { status: "idle" };
