import {
  clientContactIdSchema,
  createClientContactSchema,
  listClientContactsSchema,
  updateClientContactSchema,
} from "../schemas/client-contact.ts";
import { createTRPCRouter, providerProcedure } from "../trpc.ts";

/** Walk-in clients — people who book without an Animalesko account. */
export const clientContactRouter = createTRPCRouter({
  list: providerProcedure.input(listClientContactsSchema).query(({ ctx, input }) =>
    ctx.useCases.clientContact.list.execute({
      organizationId: ctx.organization.id,
      ...input,
    }),
  ),

  byId: providerProcedure.input(clientContactIdSchema).query(({ ctx, input }) =>
    ctx.useCases.clientContact.get.execute({
      organizationId: ctx.organization.id,
      contactId: input.id,
    }),
  ),

  create: providerProcedure.input(createClientContactSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clientContact.create.execute({
      organizationId: ctx.organization.id,
      data: input,
    }),
  ),

  update: providerProcedure.input(updateClientContactSchema).mutation(({ ctx, input }) =>
    ctx.useCases.clientContact.update.execute({
      organizationId: ctx.organization.id,
      ...input,
    }),
  ),
});
