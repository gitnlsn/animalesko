"use server";

import { z } from "zod";

import { LEAD_CATEGORIES, type LeadFormState } from "~/lib/lead";

/**
 * Lead capture for "Faça parte do universo Animalesko".
 *
 * The Framer page posted this form to Framer's own backend, which goes away
 * with the migration. Rather than couple a marketing page to Prisma — which
 * would pull the database into a deployment that otherwise has no runtime
 * dependencies at all — the submission is forwarded to whatever endpoint
 * LANDING_LEADS_WEBHOOK_URL names (a CRM, an automation hook, an internal
 * route).
 *
 * With no webhook configured the lead is logged and the visitor still gets a
 * success message. That is the right behaviour for local development and for
 * the first deploy, but it does mean leads live only in the logs until the
 * variable is set — see .env.example.
 *
 * This file exports exactly one async function on purpose: everything exported
 * from a `"use server"` module becomes a callable endpoint, so the categories
 * and the state type live in lib/lead.ts instead.
 */

/**
 * Defined here rather than exported from lib/lead.ts, because that module is
 * imported by the client component — and importing Zod from a client component
 * ships the whole library to the browser to validate three fields that get
 * validated again on the server anyway.
 */
const leadSchema = z.object({
  name: z.string().trim().min(2, "Digite seu nome completo.").max(120, "Nome longo demais."),
  email: z.email("Digite um e-mail válido.").max(180),
  category: z.enum(LEAD_CATEGORIES, { message: "Escolha uma categoria." }),
  /**
   * Honeypot. A real person never sees this field, so anything in it is a bot.
   * Cheaper and less hostile than a CAPTCHA for a form of this size.
   */
  website: z.string().max(0).optional().or(z.literal("")),
});
export async function subscribeLead(
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    category: formData.get("category"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error).fieldErrors;

    // A filled honeypot is a bot, and telling a bot it was caught only helps it
    // adapt. Report the same success a person would see and drop the payload.
    if (flattened.website) {
      return { status: "success", message: "Recebemos seu cadastro. Obrigado!" };
    }

    return {
      status: "error",
      message: "Confira os campos destacados e tente de novo.",
      errors: {
        name: flattened.name?.[0],
        email: flattened.email?.[0],
        category: flattened.category?.[0],
      },
    };
  }

  const { name, email, category } = parsed.data;
  const webhook = process.env.LANDING_LEADS_WEBHOOK_URL?.trim();

  if (!webhook) {
    console.warn(
      "[landing] LANDING_LEADS_WEBHOOK_URL is not set — lead only recorded in the logs:",
      { name, email, category },
    );
    return {
      status: "success",
      message: "Recebemos seu cadastro. Em breve entramos em contato!",
    };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        category,
        source: "landing",
        submittedAt: new Date().toISOString(),
      }),
      // A visitor should not sit on a spinner because a CRM is slow.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`webhook responded ${response.status}`);
    }
  } catch (error) {
    console.error("[landing] failed to forward lead", error);
    return {
      status: "error",
      message:
        "Não conseguimos registrar seu cadastro agora. Tente de novo em instantes ou escreva para contato@animalesko.org.",
    };
  }

  return {
    status: "success",
    message: "Recebemos seu cadastro. Em breve entramos em contato!",
  };
}
