"use client";

import {
  Badge,
  Button,
  Label,
  RadioGroup,
  RadioGroupItem,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@animalesko/ui";
import { Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SEX_LABELS, SIZE_LABELS, SPECIES_LABELS } from "~/lib/display.ts";

const ANY = "all";

/**
 * Filters written to the URL rather than held in component state.
 *
 * The prototype kept `species`, `size`, `gender` and `ages` in `useState` and
 * filtered a two-element mock array on the client, so a filtered view could not
 * be shared, bookmarked or restored on refresh — and the filtering never
 * touched the query. Here the sheet writes search params, the server component
 * reads them, and the result set comes back from Postgres.
 *
 * The prototype's fourth filter, "Idade" (Filhote / Jovem / Adulto / Idoso),
 * is deliberately absent: age is derived from `birthDate`, so those buckets are
 * date ranges rather than a column, and no procedure accepts them yet.
 */
const GROUPS = [
  { key: "species", label: "Espécie", options: SPECIES_LABELS },
  { key: "size", label: "Porte", options: SIZE_LABELS },
  { key: "sex", label: "Sexo", options: SEX_LABELS },
] as const;

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Held locally while the sheet is open so the feed does not re-query on every
  // radio click; committed on "Aplicar".
  const [draft, setDraft] = useState<Record<string, string>>(() => currentFilters(searchParams));

  const applied = currentFilters(searchParams);
  const activeCount = Object.values(applied).filter((value) => value !== ANY).length;

  function commit(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value === ANY) params.delete(key);
      else params.set(key, value);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Sheet
        open={open}
        onOpenChange={(next) => {
          // Re-sync the draft from the URL on open, so cancelling out of the
          // sheet does not leave stale radio selections behind.
          if (next) setDraft(currentFilters(searchParams));
          setOpen(next);
        }}
      >
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter size={16} />
            Filtros
            {activeCount > 0 ? (
              <Badge className="ml-1 size-5 justify-center rounded-full p-0 text-xs">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="mx-auto max-h-[80vh] max-w-md">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Filtrar pets</SheetTitle>
              {activeCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => commit({ species: ANY, size: ANY, sex: ANY })}
                >
                  <X size={16} />
                  Limpar
                </Button>
              ) : null}
            </div>
          </SheetHeader>

          <div className="space-y-6 py-2">
            {GROUPS.map((group) => (
              <fieldset key={group.key}>
                <legend className="mb-2 text-base font-medium">{group.label}</legend>
                <RadioGroup
                  value={draft[group.key] ?? ANY}
                  onValueChange={(value) => setDraft({ ...draft, [group.key]: value })}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={ANY} id={`${group.key}-all`} />
                    <Label htmlFor={`${group.key}-all`}>Todos</Label>
                  </div>
                  {Object.entries(group.options).map(([value, label]) => (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem value={value} id={`${group.key}-${value}`} />
                      <Label htmlFor={`${group.key}-${value}`}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>
            ))}
          </div>

          <Button className="w-full" onClick={() => commit(draft)}>
            Aplicar filtros
          </Button>
        </SheetContent>
      </Sheet>

      {activeCount > 0 ? (
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {GROUPS.map((group) => {
            const value = applied[group.key];
            if (!value || value === ANY) return null;

            const label = (group.options as Record<string, string>)[value];
            if (!label) return null;

            return (
              <Badge key={group.key} variant="secondary" className="whitespace-nowrap">
                {label}
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function currentFilters(searchParams: URLSearchParams | ReadonlyURLSearchParams) {
  return {
    species: searchParams.get("species") ?? ANY,
    size: searchParams.get("size") ?? ANY,
    sex: searchParams.get("sex") ?? ANY,
  };
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;
