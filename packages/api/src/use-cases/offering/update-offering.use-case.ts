import { NotFoundError } from "../errors.ts";

import type { OfferingDeps, OfferingDTO } from "./offering-deps.ts";
import type { UpdateOfferingInput } from "../../schemas/offering.ts";
import type { OrganizationCommand, UseCase } from "../types.ts";

export interface UpdateOfferingCommand extends OrganizationCommand {
  offeringId: string;
  data: Omit<UpdateOfferingInput, "id">;
}

export class UpdateOfferingUseCase implements UseCase<UpdateOfferingCommand, OfferingDTO> {
  constructor(private readonly deps: OfferingDeps) {}

  async execute({ organizationId, offeringId, data }: UpdateOfferingCommand): Promise<OfferingDTO> {
    // updateMany scoped by orgId: an offering owned by another organization
    // matches nothing, so the write is impossible rather than merely rejected.
    const result = await this.deps.db.serviceOffering.updateMany({
      where: { id: offeringId, orgId: organizationId },
      data,
    });

    if (result.count === 0) {
      throw new NotFoundError("Serviço não encontrado.");
    }

    return this.deps.db.serviceOffering.findUniqueOrThrow({ where: { id: offeringId } });
  }
}
