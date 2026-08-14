import type { Database, ServiceOffering } from "@animalesko/db";

/**
 * Every offering use case touches exactly one delegate. Naming the slice keeps
 * the dependency honest — nothing here can quietly reach for another table.
 */
export interface OfferingDeps {
  db: Pick<Database, "serviceOffering">;
}

export type OfferingDTO = ServiceOffering;
