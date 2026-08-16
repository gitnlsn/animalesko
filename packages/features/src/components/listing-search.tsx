"use client";

import { Input } from "@animalesko/ui";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Search box for the adoption feed.
 *
 * Debounced before it touches the URL: every commit re-runs the server
 * component, so pushing on each keystroke would fire a query per character.
 * 300 ms is short enough to feel live and long enough that a typed word is one
 * request.
 */
export function ListingSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const committed = searchParams.get("q") ?? "";
  const [value, setValue] = useState(committed);
  const [lastCommitted, setLastCommitted] = useState(committed);

  // Keeps the input honest when the URL changes from elsewhere — a cleared
  // filter, a back navigation. Adjusted during render rather than in an effect:
  // React re-runs this component immediately without painting the stale value,
  // where an effect would paint it and then correct itself.
  if (committed !== lastCommitted) {
    setLastCommitted(committed);
    setValue(committed);
  }

  useEffect(() => {
    if (value === committed) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, committed, pathname, router, searchParams]);

  return (
    <div className="relative">
      <Search
        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        size={16}
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Buscar pets…"
        aria-label="Buscar pets"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="pl-10"
      />
    </div>
  );
}
