# Animalesko

pnpm monorepo for the two Animalesko applications, sharing one database, one
API layer and one design system.

| Workspace         | What it is                                                                        | Port   |
| ----------------- | --------------------------------------------------------------------------------- | ------ |
| `apps/app`        | **Consumer.** Tutors adopt pets, book services, report lost pets, chat, review.   | `3000` |
| `apps/plus`       | **Provider.** Shelters, clinics, petshops and autonomous providers manage supply. | `3001` |
| `packages/db`     | Prisma schema, migrations, seed, client singleton, test helpers.                  | —      |
| `packages/api`    | tRPC routers, Zod contracts, authorisation.                                       | —      |
| `packages/auth`   | Better Auth instance shared by both apps.                                         | —      |
| `packages/ui`     | Design tokens and shared components.                                              | —      |
| `packages/config` | tsconfig / ESLint presets.                                                        | —      |

The two apps are **two Vercel projects from one repo**. They are separate
deployments that read and write the same Postgres: what a provider publishes in
`plus` is what a tutor consumes in `app`.

## Getting started

Requires Node ≥ 22.12, pnpm 11 and Docker.

```sh
cp .env.example .env
pnpm setup          # install + start Postgres + migrate + seed
pnpm dev            # both apps, on 3000 and 3001
```

`pnpm setup` is idempotent — re-run it any time.

Demo accounts (password `animalesko123` for all):

| Account                   | Signs into | Role                        |
| ------------------------- | ---------- | --------------------------- |
| `joao.silva@email.com`    | `app`      | Tutor, owns Rex and Mimi    |
| `maria.silva@email.com`   | `plus`     | Owner of _Pet Care Silva_   |
| `joao.santos@email.com`   | `plus`     | Owner of _Passeios do João_ |
| `contato@abrigoamigo.org` | `plus`     | Owner of _Abrigo Amigo_     |

## Commands

| Command                 | What it does                                          |
| ----------------------- | ----------------------------------------------------- |
| `pnpm dev`              | Both apps in watch mode                               |
| `pnpm build`            | Build everything (topologically ordered by Turborepo) |
| `pnpm typecheck`        | `tsc --noEmit` across the workspace                   |
| `pnpm lint`             | ESLint across the workspace                           |
| `pnpm test`             | Unit tests                                            |
| `pnpm test:integration` | Integration tests against the Dockerized Postgres     |
| `pnpm db:up` / `:down`  | Start / stop Postgres                                 |
| `pnpm db:migrate`       | Create and apply a migration                          |
| `pnpm db:seed`          | Re-seed (idempotent)                                  |
| `pnpm db:studio`        | Prisma Studio                                         |
| `pnpm db:nuke`          | Drop the Postgres volume and start over               |

## Database

`docker-compose.yml` provisions **two** databases in one container:

- `animalesko_dev` — what you develop against.
- `animalesko_test` — owned by the integration suite; truncated between tests.

Postgres listens on **5433** so an existing local install on 5432 keeps working.
The container runs with `fsync=off` — fine for a disposable dev cluster, never
for anything you care about.

Integration tests refuse to run against a database whose name does not end in
`_test`, so a mistyped `TEST_DATABASE_URL` cannot wipe real data.

## `apps/app` routes

The prototype was a single React component holding an `activeTab` string, plus
eleven client-side routes. Each tab is a real route here, so the adoption feed
is linkable and server-rendered.

| Route          | What it is                                                    |
| -------------- | ------------------------------------------------------------- |
| `/`            | Início — pet of the day, live counts, quick actions           |
| `/adocao`      | Adoption feed; filters and search live in the URL             |
| `/servicos`    | Services by type, with the booking dialog                     |
| `/perfil`      | Profile, gamification, settings                               |
| `/pet/[id]`    | One listing, with real OpenGraph metadata                     |
| `/favoritos`   | Saved pets and services                                       |
| `/historico`   | Bookings by status, grouped by month                          |
| `/meus-pets`   | The tutor's own animals, gated by the plan quota              |
| `/pet-alert`   | Lost-pet board with a Leaflet map — **public**                |
| `/mensagens`   | Conversations with shelters and providers                     |
| `/avaliacoes`  | Reviews written, and completed services awaiting one          |
| `/pagamento`   | Pay for a booking (no gateway yet; the `Payment` row is real) |
| `/verificacao` | What the verified badge means; provider flow lives in `plus`  |
| `/suporte`     | FAQ and a scripted responder — **public**                     |

The four tabs share `app/(shell)/layout.tsx` (gradient header + bottom nav);
everything else uses `app/(full)/layout.tsx` and brings its own `PageHeader`.

## Architecture notes

**One schema, two apps.** `packages/db` holds a single Prisma schema split by
domain (`auth`, `pets`, `providers`, `marketplace`, `community`). Both apps
import the same generated client. There is no per-app database.

**Routers are per-app.** `packages/api` exposes `appRouter` and `plusRouter`
separately, and each Next.js app mounts only its own. A provider-only procedure
is not merely unauthorised on the consumer deployment — it is not present.

**Authorisation is membership-based.** Access to `plus` requires an
`OrganizationMember` row; `providerProcedure` takes the organization from the
session, never from client input. Ownership checks scope the _query_ rather than
filtering after the fetch, so an unauthorised id is indistinguishable from a
missing one.

**Money is integer cents; age is derived.** The prototypes stored `"R$ 45/dia"`
and `age: 3`. Prices are `priceCents` + `PriceUnit` and formatted at the edge;
age is computed from `birthDate` by `formatAgePtBR`.

**One Zod schema per contract.** `packages/api/src/schemas` is used by both the
tRPC router and the react-hook-form resolver, so the client cannot accept input
the server will reject.

## Deployment

Two Vercel projects, both with **Root Directory** set to the corresponding app
(`apps/app` / `apps/plus`). Each app's `vercel.json` already sets the install and
build commands to run from the workspace root through Turborepo.

Required environment variables per project:

```
DATABASE_URL          # pooled connection
DIRECT_DATABASE_URL   # unpooled — used by migrations
BETTER_AUTH_SECRET    # openssl rand -base64 32; identical in both projects
BETTER_AUTH_URL       # that project's own public URL
AUTH_COOKIE_DOMAIN    # e.g. .animalesko.com — enables one session across both
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_PLUS_URL
BLOB_READ_WRITE_TOKEN # apps/plus only — listing photos and verification docs
```

`BLOB_READ_WRITE_TOKEN` is optional: without a Blob store those two forms accept
an image URL instead of a file, which is also how the workspace runs locally.

`BETTER_AUTH_SECRET` **must match** across both projects, or sessions minted by
one will not verify on the other.

Run `pnpm db:deploy` against production as a release step; Vercel builds do not
migrate on their own.

## Reference

`old/` holds the two original Lovable prototypes (`animalesko-app`,
`animalesko-plus`), which both apps were ported from. They are **not committed**
— each carries its own `.git`, so the directory is gitignored and lives only on
the machines of whoever cloned the prototypes. Nothing in the workspace builds,
imports or deploys them.
