import { createPetSchema, listPetsSchema, petIdSchema, updatePetSchema } from "../schemas/pet.ts";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";

/**
 * Transport adapter only.
 *
 * Every procedure does the same three things: validate the input against a
 * schema, name the actor from the session, and delegate. The rules themselves —
 * the plan limit, ownership scoping, conflict translation — live in
 * `use-cases/pet/` where they can be exercised without a tRPC caller.
 */
export const petRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listPetsSchema)
    .query(({ ctx, input }) => ctx.useCases.pet.list.execute({ actorId: ctx.user.id, ...input })),

  byId: protectedProcedure
    .input(petIdSchema)
    .query(({ ctx, input }) =>
      ctx.useCases.pet.get.execute({ actorId: ctx.user.id, petId: input.id }),
    ),

  /** Remaining slots on the caller's plan, for the UI to render the upgrade card. */
  quota: protectedProcedure.query(({ ctx }) =>
    ctx.useCases.pet.quota.execute({ actorId: ctx.user.id }),
  ),

  create: protectedProcedure
    .input(createPetSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.pet.create.execute({ actorId: ctx.user.id, data: input }),
    ),

  update: protectedProcedure.input(updatePetSchema).mutation(({ ctx, input }) => {
    const { id, ...data } = input;
    return ctx.useCases.pet.update.execute({ actorId: ctx.user.id, petId: id, data });
  }),

  delete: protectedProcedure
    .input(petIdSchema)
    .mutation(({ ctx, input }) =>
      ctx.useCases.pet.delete.execute({ actorId: ctx.user.id, petId: input.id }),
    ),
});
