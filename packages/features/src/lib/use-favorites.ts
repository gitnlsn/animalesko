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
  const { signedIn } = useSession();

  const ids = useQuery({ ...trpc.favorite.ids.queryOptions(), enabled: signedIn });

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
   * state into the ids cache immediately makes the control answer the finger;
   * `onSettled` still refetches, so the server stays the authority and the
   * points toast lands when it lands.
   *
   * The in-flight query is cancelled first because a refetch that started
   * before the tap would otherwise land after it and restore the old value.
   */
  const optimisticToggle = (field: "listingIds" | "offeringIds", id: string) => {
    const queryKey = trpc.favorite.ids.queryKey();

    // Kept in a closure rather than the mutation context: the context is typed
    // as unknown by the time it reaches onError, and rolling back through it
    // would mean casting away the very type that makes the rollback safe.
    let rollback: (() => void) | undefined;

    return {
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        rollback = () => queryClient.setQueryData(queryKey, previous);

        queryClient.setQueryData(queryKey, (old) => {
          if (!old) return old;
          const next = new Set(old[field]);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { ...old, [field]: [...next] };
        });
      },
      onError: (error: { message: string }) => {
        rollback?.();
        toast.error(error.message);
      },
    };
  };

  const toggleListing = useMutation(
    trpc.favorite.toggleListing.mutationOptions({
      onSuccess: announce,
      onError: (error) => toast.error(error.message),
      onSettled,
    }),
  );

  const toggleOffering = useMutation(
    trpc.favorite.toggleOffering.mutationOptions({
      onSuccess: announce,
      onError: (error) => toast.error(error.message),
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
    isListingFavorited: (id: string) => listingIds.has(id),
    isOfferingFavorited: (id: string) => offeringIds.has(id),
    toggleListing: (listingId: string, next: string) => {
      if (requireSignIn(next)) return;
      toggleListing.mutate({ listingId }, optimisticToggle("listingIds", listingId));
    },
    toggleOffering: (offeringId: string, next: string) => {
      if (requireSignIn(next)) return;
      toggleOffering.mutate({ offeringId }, optimisticToggle("offeringIds", offeringId));
    },
  };
}
