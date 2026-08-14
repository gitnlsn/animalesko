import { NotFoundError } from "../errors.ts";

import type { OfferingDeps } from "./offering-deps.ts";
import type { OrganizationCommand, UseCase } from "../types.ts";

export interface DeleteOfferingCommand extends OrganizationCommand {
  offeringId: string;
}

export interface DeleteOfferingResult {
  id: string;
}

export class DeleteOfferingUseCase implements UseCase<DeleteOfferingCommand, DeleteOfferingResult> {
  constructor(private readonly deps: OfferingDeps) {}

  async execute({
    organizationId,
    offeringId,
  }: DeleteOfferingCommand): Promise<DeleteOfferingResult> {
    const result = await this.deps.db.serviceOffering.deleteMany({
      where: { id: offeringId, orgId: organizationId },
    });

    if (result.count === 0) {
      throw new NotFoundError("Serviço não encontrado.");
    }

    return { id: offeringId };
  }
}
