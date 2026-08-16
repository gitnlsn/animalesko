import type { Database } from "@animalesko/db";

import type { RegisterPushDeviceInput, UnregisterPushDeviceInput } from "../../schemas/push.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface PushDeviceDeps {
  db: Pick<Database, "pushDevice">;
}

export type RegisterPushDeviceCommand = ActorCommand & RegisterPushDeviceInput;

/**
 * Claims a device token for the signed-in user.
 *
 * Upserting on `token` rather than on `(userId, token)` is the whole point: a
 * phone that is handed over, or an account switch on the same device, produces
 * the *same* token for a different user. Inserting would then leave two rows
 * and the previous owner would keep receiving the new owner's notifications, so
 * the update moves ownership instead.
 *
 * `lastSeenAt` is refreshed on every registration, which is what lets a cleanup
 * job tell a token that is merely quiet from one that is gone.
 */
export class RegisterPushDeviceUseCase implements UseCase<RegisterPushDeviceCommand, void> {
  constructor(private readonly deps: PushDeviceDeps) {}

  async execute({ actorId, token, platform }: RegisterPushDeviceCommand): Promise<void> {
    await this.deps.db.pushDevice.upsert({
      where: { token },
      create: { token, platform, userId: actorId },
      update: { userId: actorId, platform, lastSeenAt: new Date() },
    });
  }
}

export type UnregisterPushDeviceCommand = ActorCommand & UnregisterPushDeviceInput;

/**
 * Releases a device token on sign-out.
 *
 * `deleteMany` scoped by `userId`, so someone else's token deletes zero rows
 * rather than throwing something that distinguishes "not yours" from "not
 * there" — the same reasoning as `MarkNotificationReadUseCase`.
 */
export class UnregisterPushDeviceUseCase implements UseCase<UnregisterPushDeviceCommand, void> {
  constructor(private readonly deps: PushDeviceDeps) {}

  async execute({ actorId, token }: UnregisterPushDeviceCommand): Promise<void> {
    await this.deps.db.pushDevice.deleteMany({ where: { token, userId: actorId } });
  }
}
