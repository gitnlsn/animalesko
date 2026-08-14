import type { OfferingDeps, OfferingDTO } from "./offering-deps.ts";
import type { OrganizationCommand, UseCase } from "../types.ts";

/** Everything the caller's organization sells, active or not. */
export class ListOfferingsUseCase implements UseCase<OrganizationCommand, OfferingDTO[]> {
  constructor(private readonly deps: OfferingDeps) {}

  execute({ organizationId }: OrganizationCommand): Promise<OfferingDTO[]> {
    return this.deps.db.serviceOffering.findMany({
      where: { orgId: organizationId },
      orderBy: { createdAt: "desc" },
    });
  }
}
