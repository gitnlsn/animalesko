"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { subscribeLead } from "~/app/actions";
import { initialLeadState, LEAD_CATEGORIES, type LeadCategory } from "~/lib/lead";

/**
 * The one interactive island on the site.
 *
 * It is a real `<form action={serverAction}>`, so it submits and validates
 * server-side even before hydration finishes — or if the JavaScript never
 * arrives at all. `useActionState` only upgrades that baseline with inline
 * errors and a pending state.
 */

const fieldClass =
  "w-full rounded-full border border-line bg-white px-5 py-3 text-base text-ink placeholder:text-ink-soft/70 focus:border-brand focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-dark inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-medium text-white shadow-brand-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Quero fazer parte"}
    </button>
  );
}

export function LeadForm({ defaultCategory }: { defaultCategory?: LeadCategory }) {
  const [state, formAction] = useActionState(subscribeLead, initialLeadState);

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="border-brand-soft bg-brand-wash text-ink rounded-card border p-6 text-center text-lg"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {/* Honeypot: off-screen, not tabbable, never announced. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-ink mb-1.5 block text-sm font-medium">
            Nome completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Como podemos te chamar?"
            aria-describedby={state.errors?.name ? "name-error" : undefined}
            aria-invalid={state.errors?.name ? true : undefined}
            className={fieldClass}
          />
          {state.errors?.name ? (
            <p id="name-error" className="text-accent-dark mt-1.5 text-sm">
              {state.errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="text-ink mb-1.5 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            aria-describedby={state.errors?.email ? "email-error" : undefined}
            aria-invalid={state.errors?.email ? true : undefined}
            className={fieldClass}
          />
          {state.errors?.email ? (
            <p id="email-error" className="text-accent-dark mt-1.5 text-sm">
              {state.errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="category" className="text-ink mb-1.5 block text-sm font-medium">
          Você é
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={defaultCategory ?? ""}
          aria-describedby={state.errors?.category ? "category-error" : undefined}
          aria-invalid={state.errors?.category ? true : undefined}
          className={fieldClass}
        >
          <option value="" disabled>
            Escolha uma categoria
          </option>
          {LEAD_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {state.errors?.category ? (
          <p id="category-error" className="text-accent-dark mt-1.5 text-sm">
            {state.errors.category}
          </p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-accent-dark text-sm font-medium">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-center pt-2">
        <SubmitButton />
      </div>

      <p className="text-ink-soft text-center text-sm">
        Não se preocupe: pedimos só seu nome e e-mail para te enviar conteúdos especiais, e seus
        dados são tratados conforme a{" "}
        <Link href="/privacidade" className="hover:text-brand underline underline-offset-4">
          LGPD
        </Link>
        .
      </p>
    </form>
  );
}
