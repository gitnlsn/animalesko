import {
  createHealthRecordSchema,
  createVaccinationSchema,
  byPetSchema,
  recordIdSchema,
  updateVaccinationSchema,
} from "../schemas/clinical.ts";
import { createTRPCRouter, providerProcedure } from "../trpc.ts";
import { z } from "zod";

/** What a provider writes down about an animal: observations and doses. */
export const clinicalRouter = createTRPCRouter({
  healthRecords: providerProcedure.input(byPetSchema).query(({ ctx, input }) =>
    ctx.useCases.clinical.healthRecords.execute({
      organizationId: ctx.organization.id,
      petId: input.petId,
    }),
  ),

  addHealthRecord: providerProcedure.input(createHealthRecordSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clinical.addHealthRecord.execute({
      organizationId: ctx.organization.id,
      // The staff member who wrote it, for HealthRecord.authorId.
      actorId: ctx.user.id,
      data: input,
    }),
  ),

  deleteHealthRecord: providerProcedure.input(recordIdSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clinical.deleteHealthRecord.execute({
      organizationId: ctx.organization.id,
      recordId: input.id,
    }),
  ),

  vaccinations: providerProcedure.input(byPetSchema).query(({ ctx, input }) =>
    ctx.useCases.clinical.vaccinations.execute({
      organizationId: ctx.organization.id,
      petId: input.petId,
    }),
  ),

  addVaccination: providerProcedure.input(createVaccinationSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clinical.addVaccination.execute({
      organizationId: ctx.organization.id,
      data: input,
    }),
  ),

  updateVaccination: providerProcedure.input(updateVaccinationSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clinical.updateVaccination.execute({
      organizationId: ctx.organization.id,
      ...input,
    }),
  ),

  deleteVaccination: providerProcedure.input(recordIdSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clinical.deleteVaccination.execute({
      organizationId: ctx.organization.id,
      vaccinationId: input.id,
    }),
  ),

  /** Boosters coming due, for the dashboard. */
  dueVaccinations: providerProcedure
    .input(z.object({ withinDays: z.number().int().min(1).max(365).default(30) }))
    .query(({ ctx, input }) =>
      ctx.useCases.clinical.dueVaccinations.execute({
        organizationId: ctx.organization.id,
        withinDays: input.withinDays,
      }),
    ),
});
