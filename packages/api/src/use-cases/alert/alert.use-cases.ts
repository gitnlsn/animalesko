import { createAlertSchema, reportSightingSchema } from "../../schemas/alert.ts";
import { BADGE_CODES, BADGE_THRESHOLDS, POINTS } from "../../schemas/gamification.ts";
import { InvalidInputError, NotFoundError } from "../errors.ts";
import { awardBadge } from "../gamification/award-badge.ts";
import { awardPoints } from "../gamification/award-points.ts";
import { notify } from "../notification/notify.ts";
import { parseCommandData } from "../validate.ts";
import { withTransaction } from "../transaction.ts";

import type { Database, Prisma } from "@animalesko/db";

import type {
  CreateAlertInput,
  ListAlertsInput,
  ReportSightingInput,
  ResolveAlertInput,
} from "../../schemas/alert.ts";
import type { ActorCommand, UseCase } from "../types.ts";

type AlertIdInput = { id: string };

export interface AlertDeps {
  db: Pick<
    Database,
    | "lostPetAlert"
    | "lostPetSighting"
    | "pet"
    | "notification"
    | "gamificationProfile"
    | "pointsLedgerEntry"
    | "badge"
    | "userBadge"
  >;
}

const alertSelect = {
  id: true,
  status: true,
  name: true,
  species: true,
  breed: true,
  description: true,
  lastSeenLat: true,
  lastSeenLng: true,
  lastSeenAddress: true,
  lastSeenAt: true,
  contactName: true,
  contactPhone: true,
  resolvedAt: true,
  createdAt: true,
  reporter: { select: { id: true, name: true } },
  pet: { select: { id: true, name: true, photoUrl: true } },
  photos: { select: { url: true }, orderBy: { position: "asc" } },
  _count: { select: { sightings: true } },
} satisfies Prisma.LostPetAlertSelect;

export type AlertDTO = Prisma.LostPetAlertGetPayload<{ select: typeof alertSelect }>;

/**
 * Degrees of latitude per kilometre. Longitude is narrower away from the
 * equator, so its span is divided by cos(latitude) — without that correction a
 * 50 km box in São Paulo would be ~20% too narrow east-to-west.
 */
const KM_PER_DEGREE_LAT = 111.32;

function boundingBox(latitude: number, longitude: number, radiusKm: number) {
  const latSpan = radiusKm / KM_PER_DEGREE_LAT;
  const lngSpan =
    radiusKm / (KM_PER_DEGREE_LAT * Math.max(0.01, Math.cos((latitude * Math.PI) / 180)));

  return {
    lastSeenLat: { gte: latitude - latSpan, lte: latitude + latSpan },
    lastSeenLng: { gte: longitude - lngSpan, lte: longitude + lngSpan },
  };
}

export class ListAlertsUseCase implements UseCase<ListAlertsInput, AlertDTO[]> {
  constructor(private readonly deps: AlertDeps) {}

  execute({ status, species, near, limit }: ListAlertsInput): Promise<AlertDTO[]> {
    return this.deps.db.lostPetAlert.findMany({
      where: {
        // Resolved alerts stay readable by id but drop off the board.
        ...(status ? { status } : { status: { in: ["LOST", "FOUND"] } }),
        ...(species ? { species } : {}),
        ...(near ? boundingBox(near.latitude, near.longitude, near.radiusKm) : {}),
      },
      select: alertSelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export class GetAlertUseCase implements UseCase<AlertIdInput, AlertDTO> {
  constructor(private readonly deps: AlertDeps) {}

  async execute({ id }: AlertIdInput): Promise<AlertDTO> {
    const alert = await this.deps.db.lostPetAlert.findUnique({
      where: { id },
      select: alertSelect,
    });

    if (!alert) {
      throw new NotFoundError("Alerta não encontrado.");
    }

    return alert;
  }
}

export interface CreateAlertCommand extends ActorCommand {
  data: CreateAlertInput;
}

export class CreateAlertUseCase implements UseCase<CreateAlertCommand, AlertDTO> {
  constructor(private readonly deps: AlertDeps) {}

  async execute(command: CreateAlertCommand): Promise<AlertDTO> {
    const { actorId } = command;
    const { photoUrls, petId, ...data } = parseCommandData(createAlertSchema, command.data);

    // A pet may only be attached if the reporter owns it; otherwise the alert
    // is filed without one rather than rejected, since reporting a stray is the
    // common case.
    const ownedPetId = petId
      ? ((
          await this.deps.db.pet.findFirst({
            where: { id: petId, ownerId: actorId },
            select: { id: true },
          })
        )?.id ?? null)
      : null;

    if (petId && !ownedPetId) {
      throw new NotFoundError("Pet não encontrado.");
    }

    return this.deps.db.lostPetAlert.create({
      data: {
        ...data,
        reporterId: actorId,
        petId: ownedPetId,
        photos: { create: photoUrls.map((url, position) => ({ url, position })) },
      },
      select: alertSelect,
    });
  }
}

export type ReportSightingCommand = ActorCommand & ReportSightingInput;

/**
 * Reporting that you have seen a missing animal.
 *
 * Notifies the reporter — this is the entire value of the board — and awards
 * the 50 points the prototype promised for "Ajudar Pet Alert", once per alert
 * so repeat sightings of the same animal do not farm points.
 */
export class ReportSightingUseCase implements UseCase<
  ReportSightingCommand,
  { id: string; sightings: number }
> {
  constructor(private readonly deps: AlertDeps) {}

  async execute(command: ReportSightingCommand) {
    const { actorId } = command;
    const data = parseCommandData(reportSightingSchema, {
      alertId: command.alertId,
      latitude: command.latitude,
      longitude: command.longitude,
      address: command.address,
      note: command.note,
      sightedAt: command.sightedAt,
    });

    const alert = await this.deps.db.lostPetAlert.findUnique({
      where: { id: data.alertId },
      select: { id: true, name: true, status: true, reporterId: true },
    });

    if (!alert) {
      throw new NotFoundError("Alerta não encontrado.");
    }

    if (alert.status === "RESOLVED") {
      throw new InvalidInputError("Este alerta já foi encerrado.");
    }

    const sighting = await withTransaction(this.deps.db, async (tx) => {
      const created = await tx.lostPetSighting.create({
        data: {
          alertId: data.alertId,
          reporterId: actorId,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address ?? null,
          note: data.note ?? null,
          sightedAt: data.sightedAt,
        },
        select: { id: true },
      });

      // Don't notify people about their own sighting reports.
      if (alert.reporterId !== actorId) {
        await notify(tx, {
          userId: alert.reporterId,
          type: "ALERT",
          title: `Avistaram ${alert.name}! 🚨`,
          body: data.address ? `Perto de ${data.address}.` : "Um novo avistamento foi registrado.",
          href: `/pet-alert?alerta=${alert.id}`,
        });
      }

      return created;
    });

    await awardPoints(this.deps.db, {
      userId: actorId,
      points: POINTS.ALERT_SIGHTING,
      reason: "Ajudou um pet perdido! 🚨",
      source: `sighting:${alert.id}`,
      once: true,
    });

    const helped = await this.deps.db.lostPetSighting.findMany({
      where: { reporterId: actorId },
      select: { alertId: true },
      distinct: ["alertId"],
    });

    if (helped.length >= BADGE_THRESHOLDS[BADGE_CODES.ALERT_HERO]) {
      await awardBadge(this.deps.db, { userId: actorId, code: BADGE_CODES.ALERT_HERO });
    }

    const sightings = await this.deps.db.lostPetSighting.count({ where: { alertId: alert.id } });

    return { id: sighting.id, sightings };
  }
}

export type ResolveAlertCommand = ActorCommand & ResolveAlertInput;

export class ResolveAlertUseCase implements UseCase<ResolveAlertCommand, AlertDTO> {
  constructor(private readonly deps: AlertDeps) {}

  async execute({ actorId, id, status }: ResolveAlertCommand): Promise<AlertDTO> {
    // Scoped to the reporter: only whoever filed the alert may close it.
    const existing = await this.deps.db.lostPetAlert.findFirst({
      where: { id, reporterId: actorId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Alerta não encontrado.");
    }

    return this.deps.db.lostPetAlert.update({
      where: { id: existing.id },
      data: { status, resolvedAt: new Date() },
      select: alertSelect,
    });
  }
}
