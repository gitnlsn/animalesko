import {
  createOfferingSchema,
  offeringIdSchema,
  updateOfferingSchema,
} from "../schemas/offering.ts";
import { createTRPCRouter, providerProcedure } from "../trpc.ts";

/**
 * Transport adapter for what providers manage in apps/plus.
 *
 * `providerProcedure` resolves the organization from the session's membership
 * list; the router passes only that resolved id down, so the use cases cannot
 * be steered at another organization by client input.
 */
export const offeringRouter = createTRPCRouter({
  list: providerProcedure.query(({ ctx }) =>
    ctx.useCases.offering.list.execute({ organizationId: ctx.organization.id }),
  ),

  create: providerProcedure.input(createOfferingSchema).mutation(({ ctx, input }) =>
    ctx.useCases.offering.create.execute({
      organizationId: ctx.organization.id,
      data: input,
    }),
  ),

  update: providerProcedure.input(updateOfferingSchema).mutation(({ ctx, input }) => {
    const { id, ...data } = input;
    return ctx.useCases.offering.update.execute({
      organizationId: ctx.organization.id,
      offeringId: id,
      data,
    });
  }),

  delete: providerProcedure.input(offeringIdSchema).mutation(({ ctx, input }) =>
    ctx.useCases.offering.delete.execute({
      organizationId: ctx.organization.id,
      offeringId: input.id,
    }),
  ),
});
