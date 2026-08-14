import {
  createHealthRecordSchema,
  createVaccinationSchema,
  updateVaccinationSchema,
  type CreateHealthRecordInput,
  type CreateVaccinationInput,
  type UpdateVaccinationInput,
} from "../../schemas/clinical.ts";
import { assertAnimalInScope } from "../animal/animal.use-cases.ts";
import { NotFoundError } from "../errors.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { OrganizationCommand, UseCase } from "../types.ts";

export interface ClinicalDeps {
  db: Pick<Database, "healthRecord" | "vaccination" | "pet">;
  /** The staff member writing the record, for `HealthRecord.authorId`. */
}

// --- Health records ----------------------------------------------------------

const healthRecordSelect = {
  id: true,
  recordedAt: true,
  weightKg: true,
  temperatureC: true,
  symptoms: true,
  notes: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
  org: { select: { id: true, name: true } },
} satisfies Prisma.HealthRecordSelect;

type HealthRecordRow = Prisma.HealthRecordGetPayload<{ select: typeof healthRecordSelect }>;

/**
 * `Decimal` narrowed to a number, for the same reason as `PetDTO`: the class
 * survives neither superjson nor the Server Component boundary.
 */
export type HealthRecordDTO = Omit<HealthRecordRow, "weightKg" | "temperatureC"> & {
  weightKg: number | null;
  temperatureC: number | null;
};

function toHealthRecordDTO(row: HealthRecordRow): HealthRecordDTO {
  return {
    ...row,
    weightKg: row.weightKg === null ? null : row.weightKg.toNumber(),
    temperatureC: row.temperatureC === null ? null : row.temperatureC.toNumber(),
  };
}

export interface ListHealthRecordsCommand extends OrganizationCommand {
  petId: string;
}

/**
 * An animal's clinical history.
 *
 * Deliberately **not** filtered to this organization's own records: a vet
 * looking at a patient needs to see that another clinic recorded a fever last
 * week. Access is gated on having a relationship with the animal at all, which
 * `assertAnimalInScope` checks.
 */
export class ListHealthRecordsUseCase implements UseCase<
  ListHealthRecordsCommand,
  HealthRecordDTO[]
> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute({ organizationId, petId }: ListHealthRecordsCommand): Promise<HealthRecordDTO[]> {
    await assertAnimalInScope(this.deps.db, { petId, organizationId });

    const rows = await this.deps.db.healthRecord.findMany({
      where: { petId },
      select: healthRecordSelect,
      orderBy: { recordedAt: "desc" },
    });

    return rows.map(toHealthRecordDTO);
  }
}

export interface CreateHealthRecordCommand extends OrganizationCommand {
  /** Who is writing it — a staff member, not the organization. */
  actorId: string;
  data: CreateHealthRecordInput;
}

export class CreateHealthRecordUseCase implements UseCase<
  CreateHealthRecordCommand,
  HealthRecordDTO
> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute(command: CreateHealthRecordCommand): Promise<HealthRecordDTO> {
    const { organizationId, actorId } = command;
    const data = parseCommandData(createHealthRecordSchema, command.data);

    await assertAnimalInScope(this.deps.db, { petId: data.petId, organizationId });

    const row = await this.deps.db.healthRecord.create({
      data: {
        petId: data.petId,
        orgId: organizationId,
        authorId: actorId,
        recordedAt: data.recordedAt,
        weightKg: data.weightKg ?? null,
        temperatureC: data.temperatureC ?? null,
        symptoms: data.symptoms ?? null,
        notes: data.notes ?? null,
      },
      select: healthRecordSelect,
    });

    // A weight taken at the visit is also the animal's current weight; leaving
    // the two to drift is how the prototype ended up with a pet card showing a
    // figure years out of date.
    if (data.weightKg != null) {
      await this.deps.db.pet.update({
        where: { id: data.petId },
        data: { weightKg: data.weightKg },
      });
    }

    return toHealthRecordDTO(row);
  }
}

export interface DeleteHealthRecordCommand extends OrganizationCommand {
  recordId: string;
}

/**
 * Removes a record this organization wrote.
 *
 * Scoped to `orgId`: a clinic may correct its own notes, never another's.
 */
export class DeleteHealthRecordUseCase implements UseCase<
  DeleteHealthRecordCommand,
  { id: string }
> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute({ organizationId, recordId }: DeleteHealthRecordCommand) {
    const result = await this.deps.db.healthRecord.deleteMany({
      where: { id: recordId, orgId: organizationId },
    });

    if (result.count === 0) {
      throw new NotFoundError("Registro não encontrado.");
    }

    return { id: recordId };
  }
}

// --- Vaccinations ------------------------------------------------------------

const vaccinationSelect = {
  id: true,
  name: true,
  appliedAt: true,
  nextDoseAt: true,
  batch: true,
  veterinarian: true,
  notes: true,
  createdAt: true,
  org: { select: { id: true, name: true } },
  pet: { select: { id: true, name: true } },
} satisfies Prisma.VaccinationSelect;

export type VaccinationDTO = Prisma.VaccinationGetPayload<{ select: typeof vaccinationSelect }>;

export interface ListVaccinationsCommand extends OrganizationCommand {
  petId: string;
}

export class ListVaccinationsUseCase implements UseCase<ListVaccinationsCommand, VaccinationDTO[]> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute({ organizationId, petId }: ListVaccinationsCommand): Promise<VaccinationDTO[]> {
    await assertAnimalInScope(this.deps.db, { petId, organizationId });

    return this.deps.db.vaccination.findMany({
      where: { petId },
      select: vaccinationSelect,
      orderBy: { appliedAt: "desc" },
    });
  }
}

export interface CreateVaccinationCommand extends OrganizationCommand {
  data: CreateVaccinationInput;
}

export class CreateVaccinationUseCase implements UseCase<CreateVaccinationCommand, VaccinationDTO> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute(command: CreateVaccinationCommand): Promise<VaccinationDTO> {
    const { organizationId } = command;
    const data = parseCommandData(createVaccinationSchema, command.data);

    await assertAnimalInScope(this.deps.db, { petId: data.petId, organizationId });

    return this.deps.db.vaccination.create({
      data: {
        petId: data.petId,
        orgId: organizationId,
        name: data.name,
        appliedAt: data.appliedAt,
        nextDoseAt: data.nextDoseAt ?? null,
        batch: data.batch ?? null,
        veterinarian: data.veterinarian ?? null,
        notes: data.notes ?? null,
      },
      select: vaccinationSelect,
    });
  }
}

export type UpdateVaccinationCommand = OrganizationCommand & UpdateVaccinationInput;

export class UpdateVaccinationUseCase implements UseCase<UpdateVaccinationCommand, VaccinationDTO> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute(command: UpdateVaccinationCommand): Promise<VaccinationDTO> {
    const { organizationId } = command;
    const { id, ...data } = parseCommandData(updateVaccinationSchema, {
      ...command,
      organizationId: undefined,
    });

    const existing = await this.deps.db.vaccination.findFirst({
      where: { id, orgId: organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Vacina não encontrada.");
    }

    return this.deps.db.vaccination.update({
      where: { id: existing.id },
      data,
      select: vaccinationSelect,
    });
  }
}

export interface DeleteVaccinationCommand extends OrganizationCommand {
  vaccinationId: string;
}

export class DeleteVaccinationUseCase implements UseCase<DeleteVaccinationCommand, { id: string }> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute({ organizationId, vaccinationId }: DeleteVaccinationCommand) {
    const result = await this.deps.db.vaccination.deleteMany({
      where: { id: vaccinationId, orgId: organizationId },
    });

    if (result.count === 0) {
      throw new NotFoundError("Vacina não encontrada.");
    }

    return { id: vaccinationId };
  }
}

export interface DueVaccination extends VaccinationDTO {
  daysUntilDue: number;
}

/**
 * Boosters coming due across every animal the organization holds.
 *
 * Feeds the dashboard panel that the prototype filled with invented alerts
 * ("Ração acabará em 3 dias"). This one is derivable, so it is real.
 */
export class ListDueVaccinationsUseCase implements UseCase<
  OrganizationCommand & { withinDays: number },
  DueVaccination[]
> {
  constructor(private readonly deps: ClinicalDeps) {}

  async execute(
    { organizationId, withinDays }: OrganizationCommand & { withinDays: number },
    now = new Date(),
  ): Promise<DueVaccination[]> {
    const horizon = new Date(now.getTime() + withinDays * 86_400_000);

    const rows = await this.deps.db.vaccination.findMany({
      where: {
        nextDoseAt: { not: null, lte: horizon },
        // Only animals still here: a patient seen once two years ago is not
        // this organization's booster to chase.
        pet: { custodianOrgId: organizationId, deceasedAt: null },
      },
      select: vaccinationSelect,
      orderBy: { nextDoseAt: "asc" },
      take: 20,
    });

    return rows.map((row) => ({
      ...row,
      daysUntilDue: Math.ceil(((row.nextDoseAt?.getTime() ?? 0) - now.getTime()) / 86_400_000),
    }));
  }
}
