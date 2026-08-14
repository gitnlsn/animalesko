import { createReminderSchema, type CreateReminderInput } from "../../schemas/clinical.ts";
import { NotFoundError } from "../errors.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { ListRemindersInput } from "../../schemas/clinical.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface ReminderDeps {
  db: Pick<Database, "reminder">;
}

const reminderSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  pet: { select: { id: true, name: true, species: true } },
} satisfies Prisma.ReminderSelect;

export type ReminderDTO = Prisma.ReminderGetPayload<{ select: typeof reminderSelect }>;

/**
 * Reminders belong to a **person**, not an organization.
 *
 * `Reminder.userId` in pets.prisma: it is a note-to-self, and a staff member's
 * reminders do not become their colleague's. That also makes this router usable
 * from both apps unchanged — a tutor's "dar vermífugo ao Rex" is the same row
 * shape as a vet's "ligar para a dona da Mimi".
 */
export type ListRemindersCommand = ActorCommand & ListRemindersInput;

export class ListRemindersUseCase implements UseCase<ListRemindersCommand, ReminderDTO[]> {
  constructor(private readonly deps: ReminderDeps) {}

  execute({
    actorId,
    includeCompleted,
    petId,
    limit,
  }: ListRemindersCommand): Promise<ReminderDTO[]> {
    return this.deps.db.reminder.findMany({
      where: {
        userId: actorId,
        ...(includeCompleted ? {} : { completedAt: null }),
        ...(petId ? { petId } : {}),
      },
      select: reminderSelect,
      orderBy: { dueAt: "asc" },
      take: limit,
    });
  }
}

export interface CreateReminderCommand extends ActorCommand {
  data: CreateReminderInput;
}

export class CreateReminderUseCase implements UseCase<CreateReminderCommand, ReminderDTO> {
  constructor(private readonly deps: ReminderDeps) {}

  execute(command: CreateReminderCommand): Promise<ReminderDTO> {
    const data = parseCommandData(createReminderSchema, command.data);

    return this.deps.db.reminder.create({
      data: {
        userId: command.actorId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        dueAt: data.dueAt,
        petId: data.petId ?? null,
      },
      select: reminderSelect,
    });
  }
}

export interface ReminderIdCommand extends ActorCommand {
  reminderId: string;
}

export class CompleteReminderUseCase implements UseCase<ReminderIdCommand, ReminderDTO> {
  constructor(private readonly deps: ReminderDeps) {}

  async execute({ actorId, reminderId }: ReminderIdCommand): Promise<ReminderDTO> {
    const existing = await this.deps.db.reminder.findFirst({
      where: { id: reminderId, userId: actorId },
      select: { id: true, completedAt: true },
    });

    if (!existing) {
      throw new NotFoundError("Lembrete não encontrado.");
    }

    // Toggles, so an accidental tick can be undone.
    return this.deps.db.reminder.update({
      where: { id: existing.id },
      data: { completedAt: existing.completedAt ? null : new Date() },
      select: reminderSelect,
    });
  }
}

export class DeleteReminderUseCase implements UseCase<ReminderIdCommand, { id: string }> {
  constructor(private readonly deps: ReminderDeps) {}

  async execute({ actorId, reminderId }: ReminderIdCommand) {
    const result = await this.deps.db.reminder.deleteMany({
      where: { id: reminderId, userId: actorId },
    });

    if (result.count === 0) {
      throw new NotFoundError("Lembrete não encontrado.");
    }

    return { id: reminderId };
  }
}
