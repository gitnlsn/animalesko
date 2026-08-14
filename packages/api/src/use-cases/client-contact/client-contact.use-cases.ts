import {
  createClientContactSchema,
  updateClientContactSchema,
  type CreateClientContactInput,
  type ListClientContactsInput,
  type UpdateClientContactInput,
} from "../../schemas/client-contact.ts";
import { ConflictError, NotFoundError } from "../errors.ts";
import { isUniqueViolationOn } from "../prisma-errors.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { OrganizationCommand, UseCase } from "../types.ts";

export interface ClientContactDeps {
  db: Pick<Database, "clientContact">;
}

const clientContactSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  notes: true,
  createdAt: true,
  /** Whether they later signed up — `ClientContact.userId` links the two. */
  user: { select: { id: true, name: true } },
  _count: { select: { appointments: true } },
} satisfies Prisma.ClientContactSelect;

export type ClientContactDTO = Prisma.ClientContactGetPayload<{
  select: typeof clientContactSelect;
}>;

export type ListClientContactsCommand = OrganizationCommand & ListClientContactsInput;

export class ListClientContactsUseCase implements UseCase<
  ListClientContactsCommand,
  ClientContactDTO[]
> {
  constructor(private readonly deps: ClientContactDeps) {}

  execute({ organizationId, q, limit }: ListClientContactsCommand): Promise<ClientContactDTO[]> {
    const contains = { contains: q, mode: "insensitive" } as const;

    return this.deps.db.clientContact.findMany({
      where: {
        orgId: organizationId,
        ...(q ? { OR: [{ name: contains }, { phone: contains }] } : {}),
      },
      select: clientContactSelect,
      orderBy: { name: "asc" },
      take: limit,
    });
  }
}

export interface GetClientContactCommand extends OrganizationCommand {
  contactId: string;
}

export class GetClientContactUseCase implements UseCase<GetClientContactCommand, ClientContactDTO> {
  constructor(private readonly deps: ClientContactDeps) {}

  async execute({ organizationId, contactId }: GetClientContactCommand) {
    const contact = await this.deps.db.clientContact.findFirst({
      where: { id: contactId, orgId: organizationId },
      select: clientContactSelect,
    });

    if (!contact) {
      throw new NotFoundError("Cliente não encontrado.");
    }

    return contact;
  }
}

export interface CreateClientContactCommand extends OrganizationCommand {
  data: CreateClientContactInput;
}

export class CreateClientContactUseCase implements UseCase<
  CreateClientContactCommand,
  ClientContactDTO
> {
  constructor(private readonly deps: ClientContactDeps) {}

  async execute(command: CreateClientContactCommand): Promise<ClientContactDTO> {
    const data = parseCommandData(createClientContactSchema, command.data);

    try {
      return await this.deps.db.clientContact.create({
        data: {
          orgId: command.organizationId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          notes: data.notes ?? null,
        },
        select: clientContactSelect,
      });
    } catch (error) {
      if (isUniqueViolationOn(error, "phone")) {
        throw new ConflictError("Já existe um cliente com este telefone.", { cause: error });
      }
      throw error;
    }
  }
}

export type UpdateClientContactCommand = OrganizationCommand & UpdateClientContactInput;

export class UpdateClientContactUseCase implements UseCase<
  UpdateClientContactCommand,
  ClientContactDTO
> {
  constructor(private readonly deps: ClientContactDeps) {}

  async execute(command: UpdateClientContactCommand): Promise<ClientContactDTO> {
    const { organizationId } = command;
    const { id, email, ...rest } = parseCommandData(updateClientContactSchema, {
      ...command,
      organizationId: undefined,
    });

    const existing = await this.deps.db.clientContact.findFirst({
      where: { id, orgId: organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Cliente não encontrado.");
    }

    try {
      return await this.deps.db.clientContact.update({
        where: { id: existing.id },
        // `email` accepts "" so the form can clear it; stored as NULL so
        // "no e-mail" has one representation rather than two.
        data: { ...rest, ...(email === undefined ? {} : { email: email || null }) },
        select: clientContactSelect,
      });
    } catch (error) {
      if (isUniqueViolationOn(error, "phone")) {
        throw new ConflictError("Já existe um cliente com este telefone.", { cause: error });
      }
      throw error;
    }
  }
}
