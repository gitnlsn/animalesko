# Plan: 100% consumer-screen reuse between `apps/app` and `apps/mobile`

Status: ready to execute. Every fact in this document was verified against the
repo on 2026-08-17 by reading the files named. If a file does not match what
this plan says, STOP and re-read the file before editing — do not force the
plan onto drifted code.

## Goal

Every consumer screen's markup, copy and query inputs are defined **once**, in
`packages/features`. The two app shells keep only what genuinely differs:

- `apps/app` (web): route metadata, server session gate, server prefetch +
  `HydrationBoundary`.
- `apps/mobile` (static export in Capacitor): route metadata, client `<Gated>`
  gate, Suspense boundaries where `useSearchParams` demands them.

End state: ~430 duplicated lines deleted, one route-parity check that fails CI
when the two route trees drift.

## Ground rules (violating any of these is a failed execution)

1. **Dependency direction.** Nothing in `packages/features` may import from
   `apps/*`, from `@animalesko/auth` (server API), from `next/headers`, or from
   any `@capacitor/*` package. Device APIs go through
   `packages/features/src/lib/platform.ts` only.
2. **`metadata` stays in the page shells.** It is a server-only export and
   cannot live in a `"use client"` file.
3. **New shared screen files get `"use client";` at the top.** Uniform rule, no
   exceptions — avoids RSC boundary surprises for zero cost (their children are
   already client components).
4. **Do not change query inputs.** Where this plan extracts a constant, the
   value must equal what the view queries today (all values listed below are
   verified). A changed input silently breaks server prefetch → the page still
   works but hydrates empty and refetches; nothing errors. That is why review
   must check inputs character-by-character.
5. **Match local conventions**: relative imports inside `packages/features` use
   explicit extensions (`./pet-card.tsx`), app-local imports use `~/`, type
   imports use `import type`. Run lint/format after every step.
6. This Next.js version may differ from your training data. If any Next API
   behaves unexpectedly, read the guide in
   `apps/app/node_modules/next/dist/docs/` (see `apps/app/AGENTS.md`).
7. `next dev` re-adds a block to `AGENTS.md` files — that is expected; leave it
   alone.
8. Work on a branch off `main`. One commit per numbered step below, so each is
   independently revertable.

## Verified current state (the map)

`packages/features/package.json` exports `"./*": "./src/components/*.tsx"` —
**any new file in `src/components/` is automatically importable** as
`@animalesko/features/<file-name>`. No package.json change needed for screens.

Both apps have route groups `(shell)` (tab pages: header + bottom nav from
`(shell)/layout.tsx`) and `(full)` (pages that bring their own `PageHeader`).
The session context (`useSession` from `@animalesko/features`) is provided by
both layouts in `apps/app` and globally by `MobileProviders` in `apps/mobile`;
it carries `{ signedIn, userId, name }` — **not** email or organizations.

Per-route status (pairs are `apps/app/src/app/<route>/page.tsx` vs
`apps/mobile/src/app/<route>/page.tsx`):

| Route                             | Shared view used today                              | Work                                        |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------- |
| `(shell)` início                  | mobile: `home-view` · app: **inline duplicate**     | Step 2                                      |
| `(shell)/adocao`                  | mobile: `adoption-view` · app: **inline duplicate** | Step 3                                      |
| `(shell)/servicos`                | both: `services-browser`                            | none (constants only, Step 1)               |
| `(shell)/perfil`                  | both: `profile-panel`                               | **none — already at target**                |
| `entrar`                          | both: `sign-in-form`                                | **none — wrappers differ for real reasons** |
| `(full)/avaliacoes`               | both: `reviews-view`                                | Step 4 (+ copy drift fix)                   |
| `(full)/favoritos`                | both: `favorites-list`                              | Step 4                                      |
| `(full)/historico`                | both: `service-history`                             | Step 4                                      |
| `(full)/mensagens`                | both: `messages-view`                               | Step 4                                      |
| `(full)/meus-pets`                | both: `my-pets`                                     | Step 4 (subtitle unification)               |
| `(full)/pagamento`                | both: `payment-view`                                | Step 4                                      |
| `(full)/pet-alert`                | both: `pet-alert-board` (public)                    | Step 4                                      |
| `(full)/suporte`                  | both: `support-view` (public)                       | Step 4                                      |
| `(full)/verificacao`              | **none — ~115 lines duplicated twice**              | Step 5                                      |
| `(full)/pet/[id]` vs `(full)/pet` | `listing-detail` / `listing-detail-view`            | **out of scope** (see below)                |

Verified prefetch ↔ view input matches (do not break these):

| Query                                                                                                                 | Input (verified in both prefetch and view)                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `booking.list`                                                                                                        | app prefetches `{ limit: 100 }`; `service-history.tsx:93` queries `{ status, limit: 100 }`. Matches for the default tab because `status` is `undefined` there and TanStack's key hashing drops `undefined` object values. **Do not "fix" this.** |
| `message.conversations`                                                                                               | `{ limit: 30 }` (`messages-view.tsx:52`)                                                                                                                                                                                                         |
| `pet.list`                                                                                                            | `{ includeDeceased: false, limit: 50 }` (`my-pets.tsx:46`)                                                                                                                                                                                       |
| `pet.quota`, `profile.me`, `review.pending`, `review.mine`, `favorite.listings`, `favorite.offerings`, `favorite.ids` | no input                                                                                                                                                                                                                                         |
| `gamification.profile`                                                                                                | `{ limit: 5 }` (`gamification-profile.tsx:23`)                                                                                                                                                                                                   |
| `catalog.offerings`                                                                                                   | `{ type: "PET_SITTER", limit: 50 }` (first tab; `services-browser.tsx:64` builds `{ type, limit: 50 }`)                                                                                                                                          |
| `catalog.listings`                                                                                                    | home strip `{ limit: 2 }`; adoption `{ ...filters, limit: 50 }`                                                                                                                                                                                  |

Known drift to resolve while executing (product copy decisions — defaults
chosen here; the human can flip any of them by editing one line afterwards):

- **Avaliações subtitle**: app says "O que você achou dos serviços", mobile
  says "O que você avaliou e o que falta avaliar". **Use the mobile copy** (it
  describes both tabs of the view).
- **App home empty state** says "Rode `pnpm db:seed` para popular" — developer
  text shipped to users. **Use HomeView's copy** ("Nenhum pet disponível
  ainda."). This changes visible web copy; it is intended.
- **Verificação**: mobile's Plus link has `target="_blank" rel="noreferrer"`,
  app's does not. **Unify to `target="_blank" rel="noreferrer"`.** Each host
  keeps its own `NEXT_PUBLIC_PLUS_URL` fallback (app `http://localhost:3001`,
  mobile `https://plus.animalesko.org`) — that is host config, not drift.
- **Meus pets subtitle**: unify to mobile's null-safe version
  (`name ? \`Olá, ${first}\` : "Os animais que você cadastrou"`). On the web
  the name is always present (server gate), so web output is unchanged.

---

## Step 0 — Baseline

```sh
rtk git checkout -b refactor/consumer-screen-reuse
pnpm typecheck && rtk lint
```

Both must pass before any edit. Record the duplication baseline (re-run at the
end; the numbers must collapse):

```sh
# Git Bash, repo root
for r in "(full)/avaliacoes" "(full)/favoritos" "(full)/historico" "(full)/mensagens" \
         "(full)/meus-pets" "(full)/pagamento" "(full)/pet-alert" "(full)/suporte" \
         "(full)/verificacao" "(shell)/adocao" "(shell)"; do
  a="apps/app/src/app/$r/page.tsx"; m="apps/mobile/src/app/$r/page.tsx"
  d=$(diff "$a" "$m" | grep -c '^[<>]')
  printf '%-22s %s differing lines\n' "$r" "$d"
done
```

## Step 1 — Shared query-input constants

New file `packages/features/src/lib/query-inputs.ts`. **No `"use client"`
directive** — server page shells must be able to import these values, and
values exported from a client module are not usable server-side.

```ts
/**
 * Query inputs shared between a view's `useQuery` and the web app's server
 * prefetch. The tRPC query key is derived from the input, so the two must be
 * deep-equal or the prefetch silently misses and the client refetches. Keeping
 * one constant makes a mismatch unrepresentable.
 */
export const HOME_RECENT_LISTINGS_INPUT = { limit: 2 };
export const ADOPTION_PAGE_LIMIT = 50;
export const SERVICES_DEFAULT_TYPE = "PET_SITTER" as const;
export const SERVICES_PAGE_LIMIT = 50;
export const HISTORY_BOOKINGS_LIMIT = 100;
export const MESSAGES_CONVERSATIONS_INPUT = { limit: 30 };
export const MY_PETS_LIST_INPUT = { includeDeceased: false, limit: 50 };
export const GAMIFICATION_PROFILE_INPUT = { limit: 5 };
```

Add to `packages/features/package.json` `exports` (the `./*` mapping only
covers `src/components/`):

```json
"./query-inputs": "./src/lib/query-inputs.ts",
```

Then replace the literal inputs at **exactly** these call sites with the
constants (import from `../lib/query-inputs.ts` inside the package, from
`@animalesko/features/query-inputs` in the apps):

- `packages/features/src/components/home-view.tsx:27`
- `packages/features/src/components/services-browser.tsx:64` → `{ type, limit: SERVICES_PAGE_LIMIT }`; also use `SERVICES_DEFAULT_TYPE` for whatever initializes the first tab (find it in the same file).
- `packages/features/src/components/service-history.tsx:93` → `{ status, limit: HISTORY_BOOKINGS_LIMIT }`
- `packages/features/src/components/messages-view.tsx:52`
- `packages/features/src/components/my-pets.tsx:46`
- `packages/features/src/components/gamification-profile.tsx:23`
- `packages/features/src/components/adoption-view.tsx:30` → `{ ...filters, limit: ADOPTION_PAGE_LIMIT }`
- App shells: `(shell)/servicos/page.tsx`, `(shell)/perfil/page.tsx` (gamification input), `(full)/historico/page.tsx`, `(full)/mensagens/page.tsx`, `(full)/meus-pets/page.tsx` — swap the duplicated literals for the same constants.

Edge cases:

- Do **not** add `as const` to the object constants; the widened types match
  the procedure input types.
- `message.thread` (`messages-view.tsx:125`) and `payment-view.tsx:66` are
  client-only queries with no server prefetch — leave their literals alone.

Check: `pnpm typecheck && rtk lint`, then verify no literal was left behind:
`rtk grep "limit: 100" packages/features apps/app` should hit nothing in the
edited files (the constant carries the value now).

## Step 2 — App home page adopts `HomeView`

`apps/app/src/app/(shell)/page.tsx` currently inlines ~75 lines that
`packages/features/src/components/home-view.tsx` already contains. Replace the
whole file with:

```tsx
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { HomeView } from "@animalesko/features/home-view";
import { HOME_RECENT_LISTINGS_INPUT } from "@animalesko/features/query-inputs";
import { getQueryClient, trpc } from "~/trpc/server.ts";

/**
 * Início — renders the shared `HomeView`, prefetching its three queries so the
 * server response is fully populated and no skeleton is shown on the web.
 * `fetchQuery` (not `prefetchQuery`) is deliberate: a failure should surface
 * as the error page, exactly as the previous inline version behaved.
 */
export default async function HomePage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.fetchQuery(trpc.catalog.petOfTheDay.queryOptions()),
    queryClient.fetchQuery(trpc.catalog.stats.queryOptions()),
    queryClient.fetchQuery(trpc.catalog.listings.queryOptions(HOME_RECENT_LISTINGS_INPUT)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeView />
    </HydrationBoundary>
  );
}
```

Edge cases:

- The old page had no `metadata` export (the shell layout provides the title);
  do not add one.
- Known copy change: the "Rode `pnpm db:seed`" empty state disappears (see
  drift list). Do not port it into `HomeView`.
- `HomeView` is a client component; rendering it under a server page is fine —
  it server-renders with the hydrated cache, so view-source must still contain
  the pet names.

Check: with dev servers running, `rtk curl http://localhost:3000/` — the HTML
must contain `Pets adotados` **and** at least one seeded pet name (proves SSR +
prefetch still work). No hydration-error output in the `pnpm dev` log.

## Step 3 — App adoption page adopts `AdoptionView`

Replace the body of `apps/app/src/app/(shell)/adocao/page.tsx` (keep the
`metadata` export and the doc comment about URL-held filters):

```tsx
import { listingSearchParamsSchema } from "@animalesko/api/schemas";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";

import { AdoptionView } from "@animalesko/features/adoption-view";
import { ADOPTION_PAGE_LIMIT } from "@animalesko/features/query-inputs";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adoção",
  description: "Pets disponíveis para adoção responsável na Animalesko.",
};

export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = listingSearchParamsSchema.parse(raw);

  const queryClient = getQueryClient();
  await queryClient.fetchQuery(
    trpc.catalog.listings.queryOptions({ ...filters, limit: ADOPTION_PAGE_LIMIT }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <AdoptionView />
      </Suspense>
    </HydrationBoundary>
  );
}
```

Edge cases:

- The `Suspense` wrapper is required in the static export and harmless here;
  keep it so the page bodies stay identical across hosts.
- Repeated search params (`?species=DOG&species=CAT`): the server receives an
  array, the client's `Object.fromEntries` keeps the last value — the parsed
  filters can differ, the query keys then differ, and the client refetches.
  Graceful degradation, already true today for the schema's `.catch` fields.
  **Do not try to fix; do not remove the server-side parse** (it validates and
  keeps the prefetch aligned for the normal single-value case).
- `AdoptionView`'s empty states already match the old inline ones verbatim —
  nothing to port.

Check: `rtk curl "http://localhost:3000/adocao?species=DOG"` returns HTML with
dog listings rendered (SSR of the filtered feed still works).

## Step 4 — Extract the eight `(full)` screen components

For each row, create `packages/features/src/components/<file>.tsx` containing
`"use client";`, the `PageHeader`, and the `<main>` wrapper — moved verbatim
from the existing pages (they are already identical between hosts except where
the drift list says otherwise). Then shrink both page shells.

| New file               | Screen export     | View inside      | Header (title / subtitle / backTo)                                      | Gate                      |
| ---------------------- | ----------------- | ---------------- | ----------------------------------------------------------------------- | ------------------------- |
| `reviews-screen.tsx`   | `ReviewsScreen`   | `ReviewsView`    | Avaliações / **"O que você avaliou e o que falta avaliar"** / `/perfil` | gated                     |
| `favorites-screen.tsx` | `FavoritesScreen` | `FavoritesList`  | Meus favoritos / "Pets e serviços que você guardou" / `/perfil`         | gated                     |
| `history-screen.tsx`   | `HistoryScreen`   | `ServiceHistory` | Histórico de serviços / "Tudo que você já agendou" / `/perfil`          | gated                     |
| `messages-screen.tsx`  | `MessagesScreen`  | `MessagesView`   | Mensagens / "Suas conversas com abrigos e prestadores" / `/perfil`      | gated                     |
| `my-pets-screen.tsx`   | `MyPetsScreen`    | `MyPets`         | Meus pets / session-derived, see below / `/perfil`                      | gated                     |
| `payment-screen.tsx`   | `PaymentScreen`   | `PaymentView`    | Pagamento / _(no subtitle)_ / `/historico`                              | gated (next=`/historico`) |
| `pet-alert-screen.tsx` | `PetAlertScreen`  | `PetAlertBoard`  | Pet Alert / "Ajude a encontrar quem está perdido" / `/perfil`           | **public**                |
| `support-screen.tsx`   | `SupportScreen`   | `SupportView`    | Ajuda & suporte / "Estamos por aqui 🐾" / `/perfil`                     | **public**                |

Template (exactly this shape; `MyPetsScreen` is the one variation):

```tsx
"use client";

import { PageHeader } from "./page-header.tsx";
import { ServiceHistory } from "./service-history.tsx";

export function HistoryScreen() {
  return (
    <>
      <PageHeader
        title="Histórico de serviços"
        subtitle="Tudo que você já agendou"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <ServiceHistory />
      </main>
    </>
  );
}
```

`MyPetsScreen` additionally does (this replaces both hosts' subtitle logic —
the null-safe branch comes from the mobile version and renders identically on
the web, where the gate guarantees a name):

```tsx
const { name } = useSession(); // import { useSession } from "../lib/session-context.tsx";
// subtitle={name ? `Olá, ${name.split(" ")[0]}` : "Os animais que você cadastrou"}
```

Then the shells. Web (`apps/app/.../historico/page.tsx`) — keep `metadata`,
keep `requireSession` with its current redirect target, keep the exact
prefetch list each page has today (verified list in "current state" table),
render the screen:

```tsx
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { HistoryScreen } from "@animalesko/features/history-screen";
import { HISTORY_BOOKINGS_LIMIT } from "@animalesko/features/query-inputs";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Histórico de Serviços" };

export default async function ServiceHistoryPage() {
  await requireSession("/historico");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.booking.list.queryOptions({ limit: HISTORY_BOOKINGS_LIMIT }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HistoryScreen />
    </HydrationBoundary>
  );
}
```

Mobile (`apps/mobile/.../historico/page.tsx`):

```tsx
import { HistoryScreen } from "@animalesko/features/history-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Histórico de serviços" };

export default function Page() {
  return (
    <Gated next="/historico">
      <HistoryScreen />
    </Gated>
  );
}
```

Per-page edge cases:

- **meus-pets (web)**: currently uses `session.user.name` from
  `requireSession`'s return; after the change the shell no longer needs the
  return value — `await requireSession("/meus-pets");` suffices. The name now
  flows through the `SessionProvider` in the `(full)` layout. **Delete the
  mobile page's `"use client"` when converting it** — the new mobile shell has
  no hooks, and this restores its `metadata` export (add
  `{ title: "Meus Pets" }` to match its siblings; today it has none, noted in
  its own comment).
- **pagamento**: no prefetch on either host (booking id comes from a search
  param, read inside `PaymentView`). Web keeps `requireSession("/historico")`
  — note the redirect target is `/historico`, not `/pagamento`; preserve that.
- **pet-alert / suporte**: public. Web shells keep their `metadata` (including
  `description`); mobile shells keep title-only. No gate on either. These two
  shells become metadata + `return <XScreen />;` and nothing else.
- **avaliacoes**: this step lands the subtitle unification — the web copy
  changes to the mobile wording (see drift list).
- Delete the now-unused imports from every shell (`PageHeader`, the view, the
  `Card`/icon imports). Lint will catch leftovers.

Check after this step: `pnpm typecheck && rtk lint`, and the baseline diff loop
from Step 0 must show the eight `(full)` pairs differing **only** in their
wrapper (gate + prefetch + metadata) — inspect one or two by eye.

## Step 5 — `verificacao` becomes a shared screen

The two ~115-line pages differ only in how they obtain the session. The shared
`ClientSession` context does not carry email or organizations, so the screen
takes them as props — the host that knows the session passes them.

New `packages/features/src/components/verification-screen.tsx`:

```tsx
"use client";

// Move the entire JSX from apps/app/src/app/(full)/verificacao/page.tsx here,
// including its explanatory doc comment, with these substitutions:
export function VerificationScreen({
  email,
  isProvider,
  plusUrl,
}: {
  /** Signed-in user's e-mail; undefined only during the mobile session check. */
  email: string | undefined;
  isProvider: boolean;
  plusUrl: string;
}) {
  // <CardDescription>{email}</CardDescription>
  // the Plus <a> uses href={plusUrl} target="_blank" rel="noreferrer"
  // everything else verbatim from the app version
}
```

Web shell (keeps `metadata`, `requireSession`, its `http://localhost:3001`
fallback):

```tsx
export default async function VerificationPage() {
  const session = await requireSession("/verificacao");
  const organizations = session.organizations ?? [];

  return (
    <VerificationScreen
      email={session.user.email}
      isProvider={organizations.length > 0}
      plusUrl={process.env.NEXT_PUBLIC_PLUS_URL ?? "http://localhost:3001"}
    />
  );
}
```

Mobile shell (a `"use client"` page, as today, keeping `authClient.useSession()`
and the `https://plus.animalesko.org` fallback):

```tsx
"use client";
// imports: VerificationScreen, Gated, authClient

export default function VerificationPage() {
  const session = authClient.useSession();
  const organizations = session.data?.organizations ?? [];

  return (
    <Gated next="/verificacao">
      <VerificationScreen
        email={session.data?.user.email}
        isProvider={organizations.length > 0}
        plusUrl={process.env.NEXT_PUBLIC_PLUS_URL ?? "https://plus.animalesko.org"}
      />
    </Gated>
  );
}
```

Edge cases:

- `email` must render fine as `undefined` (mobile, during the token check) —
  it sits inside `<CardDescription>{email}</CardDescription>`, which is fine.
- `target="_blank"` is the unified behavior (drift list). On the web this is a
  visible change: the Plus link now opens a new tab.
- The screen must **not** import `authClient`, `requireSession`, or anything
  from either app.
- `NEXT_PUBLIC_PLUS_URL` is read in the shells, never in the screen — in the
  mobile bundle that value is inlined at build time by
  `apps/mobile/scripts/mobile.sh`, which only pins env vars read inside the
  mobile app's own compilation units. Keep it that way.

## Step 6 — Route-parity check

New file `scripts/check-route-parity.mjs` (repo root):

```js
// Fails when apps/app and apps/mobile disagree on which consumer routes exist.
// The two trees must stay mirrors; a route added to one app and not the other
// is exactly the silent drift this repo has already suffered once.
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const KNOWN_DIVERGENCES = new Map([
  // A static export cannot have dynamic segments; mobile uses /pet?id=…
  ["(full)/pet/[id]", "(full)/pet"],
]);

function routesOf(root) {
  const routes = new Set();
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry === "page.tsx") {
        routes.add(relative(root, dir).split(sep).join("/"));
      }
    }
  })(root);
  return routes;
}

const app = routesOf("apps/app/src/app");
const mobile = routesOf("apps/mobile/src/app");

for (const [a, m] of KNOWN_DIVERGENCES) {
  if (app.delete(a)) app.add(`~${a}~`);
  if (mobile.delete(m)) mobile.add(`~${a}~`); // count the pair as one route
}

const missingInMobile = [...app].filter((r) => !mobile.has(r));
const missingInApp = [...mobile].filter((r) => !app.has(r));

if (missingInMobile.length || missingInApp.length) {
  for (const r of missingInMobile) console.error(`route only in apps/app:    ${r}`);
  for (const r of missingInApp) console.error(`route only in apps/mobile: ${r}`);
  process.exit(1);
}
console.log(`route parity OK (${app.size} routes)`);
```

Wire it up:

- Root `package.json` scripts: `"check:routes": "node scripts/check-route-parity.mjs"`.
- Add a step to `.github/workflows/ci.yml` next to lint/typecheck:
  `run: node scripts/check-route-parity.mjs` (read the file first and copy the
  formatting of the neighboring jobs/steps).

Edge cases:

- Route groups `(shell)`/`(full)` are part of the compared path on purpose — a
  screen moving between groups changes its chrome and should trip the check.
- `entrar` exists in both; the script naturally passes it.
- Run it once now: it must pass **before** any of the other steps too (the
  route sets already mirror; only page contents drifted).

## Step 7 — Full verification

Run in order; all must pass:

```sh
pnpm typecheck                      # workspace-wide
rtk lint
pnpm format:check                   # prettier
node scripts/check-route-parity.mjs
pnpm --filter @animalesko/app exec next build
pnpm --filter @animalesko/mobile exec next build
```

⚠️ On Windows, do **not** use `pnpm --filter @animalesko/mobile build` — that
script chains `./scripts/audit-bundle.sh`, a bash script that fails outside
Git Bash/macOS. `exec next build` is the portable equivalent and is the part
that matters: **the mobile static export (`output: "export"`) is the strongest
check in this plan** — it hard-fails if any shared screen accidentally gained a
server-only dependency.

Smoke test (needs the local Postgres seeded; `pnpm dev` if not already
running):

1. `rtk curl http://localhost:3000/` → HTML contains `Pets adotados` and a
   seeded pet name.
2. `rtk curl "http://localhost:3000/adocao?species=DOG"` → filtered listings
   rendered server-side.
3. `rtk curl http://localhost:3000/suporte` → contains `Ajuda & suporte`.
4. In a browser: sign in on `:3000` as `joao.silva@email.com` /
   `animalesko123`; visit `/historico`, `/favoritos`, `/meus-pets`,
   `/avaliacoes`, `/mensagens`, `/verificacao` — content renders immediately
   (no skeleton flash = prefetch keys still match) and the dev-server log shows
   no hydration mismatch.
5. On `:3002` (mobile web preview): visit the same routes — `Gated` skeleton,
   then content after sign-in.

Re-run the Step 0 diff loop: `(shell)` início should be small on both sides
now, and every `(full)` pair should differ only in gate/prefetch/metadata.

## Out of scope — do not touch

- `(full)/pet/[id]` (web) vs `(full)/pet` (mobile): the split is load-bearing.
  The web route carries `generateMetadata` (per-pet OpenGraph, needs a server);
  the static export cannot have unknown dynamic segments. Both already delegate
  their UI to shared components (`listing-detail` / `listing-detail-view`).
- `entrar`: both render the shared `SignInForm`; the wrappers differ because
  `searchParams` is a server prop the export doesn't have. Already minimal.
- `(shell)`/`(full)` **layouts**: intentionally different (server session +
  `SessionProvider` on web; global `MobileProviders` on mobile).
- `apps/plus` — imports nothing from `@animalesko/features`; unaffected.
- Anything under `apps/mobile/{android,ios}/`, `capacitor.config.ts`, or the
  mobile shell scripts.

## Definition of done

- [ ] All Step 7 commands pass.
- [ ] The eight `(full)` shells + home + adocao contain no `PageHeader`, no
      `<main>`, and no view-specific JSX — only metadata, gate, prefetch, and
      one screen component.
- [ ] `verificacao` markup exists in exactly one file.
- [ ] Every prefetch input in `apps/app` is a constant imported from
      `@animalesko/features/query-inputs`, and each constant is used by the
      corresponding view.
- [ ] `check:routes` runs locally and in CI.
- [ ] One commit per step, each leaving the tree green.
