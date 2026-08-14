import type { OfferingDeps, OfferingDTO } from "./offering-deps.ts";
import type { CreateOfferingInput } from "../../schemas/offering.ts";
import type { OrganizationCommand, UseCase } from "../types.ts";

export interface CreateOfferingCommand extends OrganizationCommand {
  data: CreateOfferingInput;
}

export class CreateOfferingUseCase implements UseCase<CreateOfferingCommand, OfferingDTO> {
  constructor(private readonly deps: OfferingDeps) {}

  execute({ organizationId, data }: CreateOfferingCommand): Promise<OfferingDTO> {
    // orgId comes from the command, which the transport derives from session
    // membership — never from the request body.
    return this.deps.db.serviceOffering.create({
      data: { ...data, orgId: organizationId },
    });
  }
}
