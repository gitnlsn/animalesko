import {
  animalIdSchema,
  createAnimalSchema,
  listAnimalsSchema,
  updateAnimalSchema,
} from "../schemas/animal.ts";
import { createTRPCRouter, providerProcedure } from "../trpc.ts";

/**
 * The animals this organization is responsible for — its own custody cases and
 * the patients it attends. Not the signed-in user's personal pets: those are
 * `pet.*`, shared with the consumer app.
 */
export const animalRouter = createTRPCRouter({
  list: providerProcedure
    .input(listAnimalsSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.animal.list.execute({ organizationId: ctx.organization.id, ...input }),
    ),

  byId: providerProcedure.input(animalIdSchema).query(({ ctx, input }) =>
    ctx.useCases.animal.get.execute({
      organizationId: ctx.organization.id,
      petId: input.id,
    }),
  ),

  create: providerProcedure
    .input(createAnimalSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.animal.create.execute({ organizationId: ctx.organization.id, data: input }),
    ),

  update: providerProcedure
    .input(updateAnimalSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.animal.update.execute({ organizationId: ctx.organization.id, ...input }),
    ),
});
