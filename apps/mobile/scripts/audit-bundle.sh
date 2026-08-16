#!/usr/bin/env bash
#
# Fails if server-side code reached the shipped bundle.
#
# The native bundle is a folder of files inside an .ipa/.aab that anyone can
# unzip. Nothing that runs on the server belongs in it — not the use cases, not
# Prisma, not the Better Auth instance, and certainly not a credential.
#
# What keeps them out today is one line in `src/trpc/react.tsx`:
#
#     import type { AppRouter } from "@animalesko/api/app";
#
# `import type` is erased at compile time, so the router — and everything it
# transitively imports — never becomes a runtime dependency. Change it to a
# value import and the entire backend follows it into the bundle. That is a
# one-character mistake with no visible symptom other than size, which is
# exactly the kind worth asserting on rather than trusting.
#
# Run automatically after `next build` via the `build` script.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$APP_DIR/out"

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; OFF=$'\033[0m'
else
  RED=""; GREEN=""; DIM=""; OFF=""
fi

[ -d "$OUT" ] || { printf '%serror%s no out/ directory — run the build first.\n' "$RED" "$OFF" >&2; exit 1; }

# Markers that only exist in server code. Each is a literal that survives
# minification: class names and string constants do, local variables do not.
#
# Deliberately NOT included: "content-type", "application/json" and friends.
# They appear in use-case source but also in any HTTP client, so they cannot
# distinguish a leak from a fetch call.
FORBIDDEN=(
  # Prisma / the database layer
  "PrismaClient"
  "@prisma/client"
  "adapter-pg"
  "DATABASE_URL"
  # The tRPC server and its authorisation tiers
  "providerProcedure"
  "adminProcedure"
  "createTRPCContext"
  "createUseCases"
  # Better Auth's server instance
  "betterAuth("
  "trustedOrigins"
  "BETTER_AUTH_SECRET="
  # Use-case classes — the business logic itself
  "UseCase{"
  "ListBookingsUseCase"
  "RegisterPushDeviceUseCase"
  # Credentials that must never be inlined
  "FCM_SERVICE_ACCOUNT="
  "BLOB_READ_WRITE_TOKEN"
)

failed=0

for marker in "${FORBIDDEN[@]}"; do
  if hits=$(grep -rlF -- "$marker" "$OUT" 2>/dev/null) && [ -n "$hits" ]; then
    printf '%sLEAK%s  %s\n' "$RED" "$OFF" "$marker"
    printf '%s      %s%s\n' "$DIM" "$(echo "$hits" | head -3 | tr '\n' ' ')" "$OFF"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  cat >&2 <<EOF

${RED}Server code reached the mobile bundle.${OFF}

Most likely a type-only import became a value import. Check that
src/trpc/react.tsx still has:

    import type { AppRouter } from "@animalesko/api/app";

and that nothing imports @animalesko/db or @animalesko/auth (the server
entrypoint — @animalesko/auth/client is fine).

EOF
  exit 1
fi

printf '%s✓%s bundle audit clean %s(%d markers checked, %s)%s\n' \
  "$GREEN" "$OFF" "$DIM" "${#FORBIDDEN[@]}" "$(du -sh "$OUT" | cut -f1)" "$OFF"
