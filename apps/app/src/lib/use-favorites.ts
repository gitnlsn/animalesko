"use client";

import { toast } from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useSession } from "./session-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

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
      toggleListing.mutate({ listingId });
    },
    toggleOffering: (offeringId: string, next: string) => {
      if (requireSignIn(next)) return;
      toggleOffering.mutate({ offeringId });
    },
  };
}
