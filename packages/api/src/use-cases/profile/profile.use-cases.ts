import { updateProfileSchema } from "../../schemas/profile.ts";
import { NotFoundError } from "../errors.ts";
import { parseCommandData } from "../validate.ts";

import type { Database, Prisma } from "@animalesko/db";

import type { UpdateProfileInput } from "../../schemas/profile.ts";
import type { ActorCommand, UseCase } from "../types.ts";

export interface ProfileDeps {
  db: Pick<Database, "user" | "pet" | "booking" | "review">;
}

const profileSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  roles: true,
  phone: true,
  bio: true,
  street: true,
  city: true,
  state: true,
  postalCode: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type ProfileDTO = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export interface ProfileWithCounts {
  profile: ProfileDTO;
  counts: { pets: number; bookings: number; reviews: number };
}

export class GetProfileUseCase implements UseCase<ActorCommand, ProfileWithCounts> {
  constructor(private readonly deps: ProfileDeps) {}

  async execute({ actorId }: ActorCommand): Promise<ProfileWithCounts> {
    const [profile, pets, bookings, reviews] = await Promise.all([
      this.deps.db.user.findUnique({ where: { id: actorId }, select: profileSelect }),
      this.deps.db.pet.count({ where: { ownerId: actorId, deceasedAt: null } }),
      this.deps.db.booking.count({ where: { tutorId: actorId } }),
      this.deps.db.review.count({ where: { authorId: actorId } }),
    ]);

    if (!profile) {
      throw new NotFoundError("Perfil não encontrado.");
    }

    return { profile, counts: { pets, bookings, reviews } };
  }
}

export interface UpdateProfileCommand extends ActorCommand {
  data: UpdateProfileInput;
}

export class UpdateProfileUseCase implements UseCase<UpdateProfileCommand, ProfileDTO> {
  constructor(private readonly deps: ProfileDeps) {}

  execute(command: UpdateProfileCommand): Promise<ProfileDTO> {
    const data = parseCommandData(updateProfileSchema, command.data);

    return this.deps.db.user.update({
      where: { id: command.actorId },
      data: {
        name: data.name,
        // The schema accepts "" so clearing a field in the form is expressible;
        // it is stored as NULL rather than an empty string, so "no phone" has
        // one representation in the database instead of two.
        phone: emptyToNull(data.phone),
        bio: emptyToNull(data.bio),
        street: emptyToNull(data.street),
        city: emptyToNull(data.city),
        state: emptyToNull(data.state),
        postalCode: emptyToNull(data.postalCode),
      },
      select: profileSelect,
    });
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}
