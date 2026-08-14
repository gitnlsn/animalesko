import type { Database, PlanTier } from "@animalesko/db";

export type PetPlanDb = Pick<Database, "pet" | "subscription">;

/**
 * How many pets each plan allows.
 *
 * The `plus` prototype rendered "Plano Gratuito — você pode cadastrar até 1 pet"
 * as static copy while happily accepting unlimited pets. The number lives here
 * now, and both the quota read and the create path derive from it, so what the
 * UI promises and what the server enforces cannot disagree.
 */
export const PET_LIMIT_BY_TIER: Record<PlanTier, number> = {
  FREE: 3,
  PREMIUM: Number.POSITIVE_INFINITY,
};

export interface PetQuota {
  tier: PlanTier;
  used: number;
  /** `null` when the plan is unlimited. */
  limit: number | null;
  /** `null` when the plan is unlimited. */
  remaining: number | null;
}

export async function resolvePetQuota(db: PetPlanDb, ownerId: string): Promise<PetQuota> {
  const [subscription, used] = await Promise.all([
    db.subscription.findUnique({ where: { userId: ownerId }, select: { tier: true } }),
    // Deceased pets keep their records but stop consuming a slot.
    db.pet.count({ where: { ownerId, deceasedAt: null } }),
  ]);

  const tier = subscription?.tier ?? "FREE";
  const limit = PET_LIMIT_BY_TIER[tier];
  const finite = Number.isFinite(limit);

  return {
    tier,
    used,
    limit: finite ? limit : null,
    remaining: finite ? Math.max(0, limit - used) : null,
  };
}
