"use client";

import {
  billableUnits,
  formatBRL,
  formatPrice,
  quotePriceCents,
  type PriceUnit,
} from "@animalesko/api/schemas";
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, PawPrint } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatShortDatePtBR, SPECIES_EMOJI } from "../lib/display.ts";
import { useSession } from "../lib/session-context.tsx";
import { useTRPC } from "../trpc.ts";

import type { PublicOfferingDTO } from "@animalesko/api";
import type { DateRange } from "@animalesko/ui";

/**
 * Units billed over a span of days take a date range; the rest take one day
 * plus a start time.
 *
 * This is the whole difference between the prototype's two dialogs —
 * `PetSitterBookingDialog` (range) and `BookingDialog` (day + time + duration).
 * They are one component here, and the mode is decided by the offering's
 * `priceUnit` rather than by `service.title === "Pet Sitter"`, which is how the
 * prototype chose and which broke the moment a provider renamed their service.
 */
const RANGE_UNITS: readonly PriceUnit[] = ["PER_DAY", "PER_NIGHT"];

/** Half-hour slots from 06:00 to 20:00, as the prototype offered. */
const TIME_SLOTS = Array.from({ length: 29 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 horas" },
  { value: "240", label: "4 horas" },
  { value: "480", label: "8 horas" },
];

interface BookingDialogProps {
  offering: PublicOfferingDTO | null;
  onOpenChange: (open: boolean) => void;
}

function atTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(day);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

export function BookingDialog({ offering, onOpenChange }: BookingDialogProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signedIn } = useSession();

  const isRange = offering ? RANGE_UNITS.includes(offering.priceUnit) : false;

  const [petId, setPetId] = useState<string>("");
  const [day, setDay] = useState<Date | undefined>();
  const [range, setRange] = useState<DateRange | undefined>();
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");

  const pets = useQuery({
    ...trpc.pet.list.queryOptions({ includeDeceased: false, limit: 50 }),
    enabled: signedIn && offering !== null,
  });

  function reset() {
    setPetId("");
    setDay(undefined);
    setRange(undefined);
    setTime("09:00");
    setDurationMinutes("60");
    setNotes("");
  }

  const createBooking = useMutation(
    trpc.booking.create.mutationOptions({
      onSuccess: async (booking) => {
        toast.success("Agendamento solicitado! 🐾", {
          description: `${booking.offering.title} — código ${booking.code}.`,
        });
        reset();
        onOpenChange(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.booking.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.notification.pathKey() }),
        ]);
        router.push("/historico");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!offering) return null;

  const window = resolveWindow();
  const total = window
    ? quotePriceCents(offering.priceCents, offering.priceUnit, window.startsAt, window.endsAt)
    : null;
  const units = window ? billableUnits(offering.priceUnit, window.startsAt, window.endsAt) : 0;

  function resolveWindow(): { startsAt: Date; endsAt: Date } | null {
    if (!offering) return null;

    if (isRange) {
      if (!range?.from || !range.to) return null;
      // Check-in mid-morning, check-out mid-morning — a range of "12 to 14" is
      // two nights, which is what `billableUnits` counts.
      return { startsAt: atTime(range.from, "09:00"), endsAt: atTime(range.to, "09:00") };
    }

    if (!day) return null;
    const startsAt = atTime(day, time);
    return { startsAt, endsAt: new Date(startsAt.getTime() + Number(durationMinutes) * 60_000) };
  }

  const petItems = pets.data?.items ?? [];

  // Preselects the only pet, so the common case is one tap instead of two.
  // Derived rather than pushed into state by an effect: the value is a pure
  // function of the loaded list and the explicit choice.
  const selectedPetId = petId || (petItems.length === 1 ? (petItems[0]?.id ?? "") : "");
  const canSubmit = Boolean(selectedPetId && window);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offering.title}</DialogTitle>
          <DialogDescription>
            {offering.org.name} · {formatPrice(offering.priceCents, offering.priceUnit)}
          </DialogDescription>
        </DialogHeader>

        {!signedIn ? (
          <div className="space-y-4 py-4 text-center">
            <PawPrint className="mx-auto size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para agendar este serviço.
            </p>
            <Button asChild className="w-full">
              <Link href="/entrar?next=/servicos">Entrar</Link>
            </Button>
          </div>
        ) : petItems.length === 0 ? (
          <div className="space-y-4 py-4 text-center">
            <PawPrint className="mx-auto size-10 text-muted-foreground" />
            <p className="font-medium">Cadastre um pet primeiro</p>
            <p className="text-sm text-muted-foreground">
              Um agendamento é sempre para um pet específico.
            </p>
            <Button asChild className="w-full">
              <Link href="/meus-pets">Adicionar pet</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="booking-pet">Para qual pet?</Label>
              <Select value={selectedPetId} onValueChange={setPetId}>
                <SelectTrigger id="booking-pet">
                  <SelectValue placeholder="Selecione um pet" />
                </SelectTrigger>
                <SelectContent>
                  {petItems.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {SPECIES_EMOJI[pet.species]} {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isRange ? "Período" : "Data"}</Label>
              <div className="flex justify-center rounded-lg border">
                {isRange ? (
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    disabled={{ before: new Date() }}
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={day}
                    onSelect={setDay}
                    disabled={{ before: new Date() }}
                  />
                )}
              </div>
            </div>

            {!isRange ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="booking-time">Horário</Label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger id="booking-time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="booking-duration">Duração</Label>
                  <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                    <SelectTrigger id="booking-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="booking-notes">Observações</Label>
              <Textarea
                id="booking-notes"
                rows={2}
                placeholder="Medicação, rotina, chave com o porteiro…"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            {/* Computed with the same function the server charges with, so the
                preview cannot promise a different number from the invoice. */}
            <div className="rounded-lg bg-muted p-3">
              {window && total !== null ? (
                <>
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays size={14} />
                    <span>
                      {isRange && range?.from && range.to
                        ? `${formatShortDatePtBR(range.from)} a ${formatShortDatePtBR(range.to)}`
                        : `${formatShortDatePtBR(window.startsAt)} às ${time}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {units} × {formatPrice(offering.priceCents, offering.priceUnit)}
                    </span>
                    <span className="text-lg font-bold text-foreground">{formatBRL(total)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isRange
                    ? "Escolha a data de início e de fim para ver o total."
                    : "Escolha uma data para ver o total."}
                </p>
              )}
            </div>
          </div>
        )}

        {signedIn && petItems.length > 0 ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              loading={createBooking.isPending}
              onClick={() => {
                if (!window) return;
                createBooking.mutate({
                  offeringId: offering.id,
                  petId: selectedPetId,
                  startsAt: window.startsAt,
                  endsAt: window.endsAt,
                  notes: notes.trim() || null,
                });
              }}
            >
              Confirmar agendamento
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
