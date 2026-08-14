import { submitVerificationSchema, updateOrganizationSchema } from "../schemas/organization.ts";
import { adminProcedure, createTRPCRouter, providerProcedure } from "../trpc.ts";

/**
 * The organization itself.
 *
 * Reads are open to any member; changing the business or submitting its
 * documents is `adminProcedure`, so a STAFF account can run the agenda all day
 * without being able to rename the clinic.
 */
export const organizationRouter = createTRPCRouter({
  current: providerProcedure.query(({ ctx }) =>
    ctx.useCases.organization.get.execute({ organizationId: ctx.organization.id }),
  ),

  stats: providerProcedure.query(({ ctx }) =>
    ctx.useCases.organization.stats.execute({ organizationId: ctx.organization.id }),
  ),

  update: adminProcedure.input(updateOrganizationSchema).mutation(({ ctx, input }) =>
    ctx.useCases.organization.update.execute({
      organizationId: ctx.organization.id,
      data: input,
    }),
  ),

  verification: providerProcedure.query(({ ctx }) =>
    ctx.useCases.organization.verification.execute({ organizationId: ctx.organization.id }),
  ),

  submitVerification: adminProcedure.input(submitVerificationSchema).mutation(({ ctx, input }) =>
    ctx.useCases.organization.submitVerification.execute({
      organizationId: ctx.organization.id,
      data: input,
    }),
  ),
});
