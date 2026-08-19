"use client";

import { toast } from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useSession } from "./session-context.tsx";
import { useTRPC } from "../trpc.ts";

/**
 * Favourite state for a whole grid, from one request.
 *
 * `favorite.ids` returns just the ids, so twelve cards share a single query
 * instead of asking "am I favourited?" twelve times. Toggling invalidates that
 * query plus the gamification profile, because favouriting awards points and
 * the header/profile totals would otherwise sit stale until a reload.
 */
export function useFavorites() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signedIn, resolving } = useSession();

  const ids = useQuery({ ...trpc.favorite.ids.queryOptions(), enabled: signedIn });

  /**
   * Whether the hearts are allowed to state a fact yet.
   *
   * `ids.data?.listingIds ?? []` reads as "nothing is favourited" during both
   * the session round trip and the query that follows it, so up to fifty cards
   * would draw a hollow heart and then quietly fill in. An empty answer and an
   * unknown one are different things, and only one of them should be rendered
   * as an answer. A signed-out visitor is the exception: there is nothing to
   * fetch, so `[]` is the real state rather than a placeholder for one.
   */
  const favoritesResolved = !resolving && (!signedIn || ids.isFetched);

  const onSettled = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.favorite.pathKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.gamification.pathKey() }),
    ]);
  };

  const announce = (result: { favorited: boolean; pointsAwarded: number }) => {
    if (result.pointsAwarded > 0) {
      toast.success(`+${result.pointsAwarded} Pontos Aumigos! 🎉`, {
        description: "Favoritou um pet! 💚",
      });
      return;
    }

    toast.success(result.favorited ? "Adicionado aos favoritos 💚" : "Removido dos favoritos");
  };

  /**
   * Flip the heart before the server answers.
   *
   * A favourite is a small, reversible, self-evident action, and the round trip
   * is long enough on a phone that waiting for it reads as a dropped tap — so
   * people press again, and the second press undoes the first. Writing the new
   * state into the cache immediately makes the control answer the finger;
   * `onSettled` still refetches, so the server stays the authority and the
   * points toast lands when it lands.
   *
   * This has to be wired into `mutationOptions`, not passed as the second
   * argument of `mutate(variables, options)`. That argument is `MutateOptions`,
   * which carries only `onSuccess`/`onError`/`onSettled` — query-core reads
   * `onMutate` exclusively from the mutation's own options, so an `onMutate`
   * handed to `mutate()` is accepted by the type checker and then never called.
   * It was written that way here originally, which meant none of this ran: the
   * heart waited for the network the whole time it was documented as not
   * waiting.
   *
   * The in-flight query is cancelled first because a refetch that started
   * before the tap would otherwise land after it and restore the old value.
   *
   * The undo is returned rather than stashed in a ref. Whatever `onMutate`
   * returns is handed back to `onError` as the mutation context, which is both
   * the mechanism designed for this and the only one that survives two taps
   * overlapping — a single ref would have the second toggle overwrite the
   * first one's undo, so a failure would roll back to the wrong state.
   */
  const applyOptimisticToggle = async (field: "listingIds" | "offeringIds", id: string) => {
    const idsKey = trpc.favorite.ids.queryKey();

    await queryClient.cancelQueries({ queryKey: idsKey });

    const previousIds = queryClient.getQueryData(idsKey);
    const wasFavorited = new Set(previousIds?.[field] ?? []).has(id);

    queryClient.setQueryData(idsKey, (old) => {
      if (!old) return old;
      const next = new Set(old[field]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...old, [field]: [...next] };
    });

    /**
     * The rows `/favoritos` renders, which are a different query from the ids.
     *
     * Patching only the ids answers instantly everywhere the heart is the whole
     * UI — but on the favourites screen the control is a bin icon and the
     * feedback people look for is the row leaving. That row comes from here.
     *
     * Pets and services are separate queries holding different row types, so
     * each is patched in its own branch rather than through a single key picked
     * by a ternary. A key typed as "either query" widens the updater's return
     * type to `(Listing | Offering)[]`, which then satisfies neither list.
     *
     * Only removal is mirrored. Adding one would mean inventing a whole row —
     * name, photo, city, price — that only the server has; `onSettled` refetches
     * and it arrives then.
     */
    let restoreList: (() => void) | undefined;

    if (field === "listingIds") {
      const listKey = trpc.favorite.listings.queryKey();
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData(listKey);
      restoreList = () => queryClient.setQueryData(listKey, previousList);

      if (wasFavorited) {
        queryClient.setQueryData(listKey, (old) =>
          old ? old.filter((row) => row.id !== id) : old,
        );
      }
    } else {
      const listKey = trpc.favorite.offerings.queryKey();
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData(listKey);
      restoreList = () => queryClient.setQueryData(listKey, previousList);

      if (wasFavorited) {
        queryClient.setQueryData(listKey, (old) =>
          old ? old.filter((row) => row.id !== id) : old,
        );
      }
    }

    return () => {
      queryClient.setQueryData(idsKey, previousIds);
      restoreList?.();
    };
  };

  const toggleListing = useMutation(
    trpc.favorite.toggleListing.mutationOptions({
      onMutate: (variables) => applyOptimisticToggle("listingIds", variables.listingId),
      onSuccess: announce,
      onError: (error, _variables, rollback) => {
        rollback?.();
        toast.error(error.message);
      },
      onSettled,
    }),
  );

  const toggleOffering = useMutation(
    trpc.favorite.toggleOffering.mutationOptions({
      onMutate: (variables) => applyOptimisticToggle("offeringIds", variables.offeringId),
      onSuccess: announce,
      onError: (error, _variables, rollback) => {
        rollback?.();
        toast.error(error.message);
      },
      onSettled,
    }),
  );

  /** Sends an anonymous visitor to sign in rather than failing the mutation. */
  const requireSignIn = (next: string): boolean => {
    if (signedIn) return false;

    router.push(`/entrar?next=${encodeURIComponent(next)}`);
    return true;
  };

  const listingIds = new Set(ids.data?.listingIds ?? []);
  const offeringIds = new Set(ids.data?.offeringIds ?? []);

  return {
    favoritesResolved,
    isListingFavorited: (id: string) => listingIds.has(id),
    isOfferingFavorited: (id: string) => offeringIds.has(id),
    toggleListing: (listingId: string, next: string) => {
      if (requireSignIn(next)) return;
      toggleListing.mutate({ listingId });
    },
    toggleOffering: (offeringId: string, next: string) => {
      if (requireSignIn(next)) return;
      toggleOffering.mutate({ offeringId });
    },
  };
}
