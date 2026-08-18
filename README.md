# Animalesko

pnpm monorepo for the two Animalesko applications, sharing one database, one
API layer and one design system.

| Workspace           | What it is                                                                        | Port   |
| ------------------- | --------------------------------------------------------------------------------- | ------ |
| `apps/app`          | **Consumer.** Tutors adopt pets, book services, report lost pets, chat, review.   | `3000` |
| `apps/plus`         | **Provider.** Shelters, clinics, petshops and autonomous providers manage supply. | `3001` |
| `apps/mobile`       | **Consumer, native.** `apps/app` as iOS/Android binaries — see its README.        | `3002` |
| `apps/landing`      | **Public.** The marketing site at `animalesko.org` — static, SEO-first.           | `3003` |
| `packages/db`       | Prisma schema, migrations, seed, client singleton, test helpers.                  | —      |
| `packages/api`      | tRPC routers, Zod contracts, authorisation.                                       | —      |
| `packages/auth`     | Better Auth instance shared by both apps.                                         | —      |
| `packages/features` | The consumer screens, shared by `apps/app` and `apps/mobile`.                     | —      |
| `packages/ui`       | Design tokens and shared components.                                              | —      |
| `packages/config`   | tsconfig / ESLint presets.                                                        | —      |

`app` and `plus` are **two Vercel projects from one repo**. They are separate
deployments that read and write the same Postgres: what a provider publishes in
`plus` is what a tutor consumes in `app`. `landing` is a third project and
touches neither — it is a static marketing site whose job is to send each
visitor to the right one of the other two.

| Public host                 | Serves         |
| --------------------------- | -------------- |
| `animalesko.org`            | `apps/landing` |
| `app.animalesko.org`        | `apps/app`     |
| `backoffice.animalesko.org` | `apps/plus`    |

## Getting started

Requires Node ≥ 22.12, pnpm 11 and Docker.

```sh
cp .env.example .env
pnpm setup          # install + start Postgres + migrate + seed
pnpm dev            # both apps, on 3000 and 3001
```

Re-run `pnpm setup` any time; the seed step wipes and rebuilds the demonstration
data rather than adding to it. Sign in as `joao.silva@email.com` with the
password `animalesko123` — see [Seeding and cleanup](#seeding-and-cleanup) for
the rest of the accounts.

## Commands

| Command                  | What it does                                          |
| ------------------------ | ----------------------------------------------------- |
| `pnpm dev`               | Both apps in watch mode                               |
| `pnpm build`             | Build everything (topologically ordered by Turborepo) |
| `pnpm typecheck`         | `tsc --noEmit` across the workspace                   |
| `pnpm lint`              | ESLint across the workspace                           |
| `pnpm test`              | Unit tests                                            |
| `pnpm test:integration`  | Integration tests against the Dockerized Postgres     |
| `pnpm db:up` / `:down`   | Start / stop Postgres                                 |
| `pnpm db:migrate`        | Create and apply a migration                          |
| `pnpm db:seed`           | Wipe and re-populate with demonstration data          |
| `pnpm db:seed:reference` | Badges and the administrator only — no demo data      |
| `pnpm db:cleanup`        | Remove all demonstration data, ready for real users   |
| `pnpm db:studio`         | Prisma Studio                                         |
| `pnpm db:nuke`           | Drop the Postgres volume and start over               |

## Seeding and cleanup

The seed exists so both apps can be reviewed with a full database, and the
cleanup exists so the same database can then be handed to real users. They are
two halves of one operation and share their safety rails.

```sh
pnpm db:seed             # wipe, then write ~5.5k rows of demonstration data
pnpm db:cleanup          # remove all of it, leaving a database ready for signups
pnpm db:seed:reference   # badges + administrator only, no demo data
```

**`pnpm db:seed` is destructive.** It truncates every table before writing,
rather than upserting in place, because every date it produces is relative to
the moment it runs — an idempotent re-seed three weeks later would leave "hoje
na agenda" pointing at a day three weeks past. Re-running it is the intended way
to refresh the data.

The dataset is deterministic: `SEED_RANDOM_SEED` (default `animalesko`) fixes
every draw, so two runs produce identical rows and a screenshot can be
reproduced from the seed alone. Demo rows carry a `cdmo…` primary key, which is
a valid cuid — around fifty procedures validate their id argument with
`z.cuid()`, so an obviously-synthetic id would be rejected by the contract
before the query ran.

It finishes by checking itself. Twenty-one assertions cover the conditions that
decide whether a screen renders content or an empty state — an `ADOPTED` listing
dated inside the current month, appointments dated today, vaccinations both
overdue and nearly due, offerings for all four `/servicos` tabs, and so on — and
the command exits non-zero if any fails.

| Account                   | Signs into | Role                                              |
| ------------------------- | ---------- | ------------------------------------------------- |
| `joao.silva@email.com`    | `app`      | Tutor — the account to review with                |
| `carla.menezes@email.com` | `app`      | PREMIUM foster home, 55 animals                   |
| `maria.silva@email.com`   | `plus`     | Owner of _Pet Care Silva_, member of a second org |
| `joao.santos@email.com`   | `plus`     | Owner of _Passeios do João_                       |
| `contato@abrigoamigo.org` | `plus`     | Owner of _Abrigo Amigo_ (shelter)                 |

Password `animalesko123` for all of them.

### What cleanup leaves behind

`pnpm db:cleanup` truncates everything and re-applies the reference layer: the
four `Badge` rows, which are application content rather than demonstration data,
and one administrator built from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Set neither
and no administrator is created — there is deliberately no default password. It
verifies the result with `COUNT(*)` and fails if anything else survived.

Truncation rather than deleting-what-the-seed-wrote is not laziness: the table
list comes from `pg_tables`, so a model added later cannot be missed, and four
relations are `onDelete: SetNull` (`Appointment.tutorId`,
`HealthRecord.authorId`, `Vaccination.orgId`, `ClientContact.userId`), which
means deleting the seeded users and organizations would orphan rows rather than
remove them.

Images uploaded through `plus` during a review live in Vercel Blob under
`org/{orgId}/…` and are **not** removed by a database truncate. The seed itself
only writes external URLs, so this only matters if somebody uploaded something.

### Running against production

Both commands take their target from `DIRECT_DATABASE_URL`. Against `localhost`
they run unguarded; against anything else they refuse unless `SEED_CONFIRM`
matches the database name exactly, and they print the host, the database and the
row counts they are about to destroy before touching anything.

```sh
export DIRECT_DATABASE_URL='<Neon unpooled URL>'   # not the -pooler host
export SEED_CONFIRM='<database name>'

pnpm db:deploy                                     # migrations first
pnpm db:seed                                       # review with full data
#   … walk both deployments …
ADMIN_EMAIL='…' ADMIN_PASSWORD='…' pnpm db:cleanup # hand over
```

CI never seeds. The `migrate` job in `.github/workflows/ci.yml` runs
`pnpm db:deploy` and nothing else; seeding and cleanup are deliberately manual.

One thing to undo afterwards: both `next.config.ts` files allow
`images.unsplash.com` so the demonstration photos can be optimised by
`next/image`. Nothing but the seed uses it, and it can be dropped once the
database has been handed over.

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

## `apps/landing` routes

The public site, ported from the Framer page that used to live at
`animalesko.framer.website`. Every route is prerendered as static HTML; the only
client component on the whole site is the lead form.

| Route               | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `/`                 | Hero, the tutor/provider split, services, how it works, FAQ, form |
| `/servicos`         | Index of the six services                                         |
| `/servicos/[slug]`  | One page per service — copy, what's included, its own FAQ         |
| `/para-tutores`     | What the app does, and where it lives                             |
| `/para-prestadores` | What the back office does, and where it lives                     |
| `/ongs`             | For shelters and independent rescuers                             |
| `/privacidade`      | LGPD notice for the data this site collects                       |

The Framer page pointed all six "Saiba mais" buttons at one "página em
construção", so six separate search intents had nothing to rank. Splitting them
into real pages, each with its own title, description, copy and FAQ, is the
largest single SEO change in the port.

What the app emits for search engines:

- **Metadata** — `metadataBase` plus a self-referencing `<link rel="canonical">`
  on every route, OpenGraph and Twitter cards, `pt-BR` locale.
- **Share images** — generated with `ImageResponse` at 1200×630: one for the
  site, one per service.
- **Structured data** — a connected graph: `Organization` and `WebSite` in the
  root layout, then `Service`, `FAQPage`, `BreadcrumbList`, `ItemList` and
  `WebApplication` per route, all referring back to the organisation by `@id`.
- **`sitemap.xml` / `robots.txt`** — generated from the same content module the
  pages render from, so they cannot drift.
- **Performance** — fonts self-hosted through `next/font`, images served as
  AVIF/WebP through `next/image` with blur placeholders and explicit dimensions
  (no layout shift), the hero preloaded as the LCP element.

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

Three Vercel projects, each with **Root Directory** set to the corresponding app
(`apps/app` / `apps/plus` / `apps/landing`). Each app's `vercel.json` already
sets the install and build commands to run from the workspace root through
Turborepo.

Required environment variables per project:

```
DATABASE_URL          # pooled connection
DIRECT_DATABASE_URL   # unpooled — used by migrations
BETTER_AUTH_SECRET    # openssl rand -base64 32; identical in both projects
BETTER_AUTH_URL       # that project's own public URL
AUTH_COOKIE_DOMAIN    # e.g. .animalesko.org — enables one session across both
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_PLUS_URL
BLOB_READ_WRITE_TOKEN # apps/plus only — listing photos and verification docs
```

`BLOB_READ_WRITE_TOKEN` is optional: without a Blob store those two forms accept
an image URL instead of a file, which is also how the workspace runs locally.

`BETTER_AUTH_SECRET` **must match** across both projects, or sessions minted by
one will not verify on the other.

`apps/landing` needs none of the above — it has no database, no auth and no
tRPC. Its variables are:

```
NEXT_PUBLIC_SITE_URL        # canonical origin, e.g. https://animalesko.org
NEXT_PUBLIC_APP_URL         # https://app.animalesko.org
NEXT_PUBLIC_BACKOFFICE_URL  # https://backoffice.animalesko.org — see below
LANDING_LEADS_WEBHOOK_URL   # where the "faça parte" form posts a lead
GOOGLE_SITE_VERIFICATION    # only if verifying Search Console by meta tag
```

`NEXT_PUBLIC_BACKOFFICE_URL` is the switch for the provider entry points. While
it is **empty**, the landing prints `backoffice.animalesko.org` as plain text
with an "em breve" badge and routes providers to the contact form instead of to
a link that would not resolve. Set it once the subdomain points at the
`apps/plus` deployment and every one of those buttons becomes a real link —
redeploy is all that is needed, there is no code change.

Only the production deployment is indexable: `robots.ts` and the metadata both
read `VERCEL_ENV`, so preview builds serve `Disallow: /` and `noindex`. Set
`NEXT_PUBLIC_FORCE_INDEXABLE=true` if you ever need a non-production deployment
to be crawlable.

Run `pnpm db:deploy` against production as a release step; Vercel builds do not
migrate on their own. `SEED_CONFIRM`, `SEED_RANDOM_SEED` and `ADMIN_*` are read
only by the seed and cleanup scripts, which are run by hand from a shell — they
do not belong in either Vercel project.

## Reference

`old/` holds the two original Lovable prototypes (`animalesko-app`,
`animalesko-plus`), which both apps were ported from. They are **not committed**
— each carries its own `.git`, so the directory is gitignored and lives only on
the machines of whoever cloned the prototypes. Nothing in the workspace builds,
imports or deploys them.
