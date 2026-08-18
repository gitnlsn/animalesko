"use client";

import {
  formatAppointmentStatus,
  STATUS_TRANSITIONS,
  type AppointmentPeriod,
  type AppointmentStatus,
} from "@animalesko/api/schemas";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  ListSkeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Dog,
  FileText,
  Phone,
  Search,
  User,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppointmentForm } from "./appointment-form.tsx";
import {
  APPOINTMENT_STATUS_VARIANT,
  appointmentClientLabel,
  appointmentClientPhone,
  isRegisteredClient,
} from "~/lib/appointment.ts";
import { formatTimePtBR, formatWeekdayPtBR } from "~/lib/display.ts";
import { useTRPC } from "~/trpc/react.tsx";

import type { AppointmentDTO } from "@animalesko/api";

const PERIODS: { value: AppointmentPeriod; label: string }[] = [
  { value: "all", label: "Todos os períodos" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "upcoming", label: "Próximos" },
];

const STATUSES: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "COMPLETED", label: "Realizado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "NO_SHOW", label: "Não compareceu" },
];

interface AgendaProps {
  status?: AppointmentStatus;
  period: AppointmentPeriod;
  q?: string;
}

/**
 * The prototype's `AppointmentsList`, with its filters moved into the URL.
 *
 * It held `searchTerm`, `statusFilter`, `periodFilter` and `sortBy` in
 * `useState` and filtered a six-element mock array in the browser. These drive
 * a real query, and a filtered agenda can be bookmarked or shared with a
 * colleague.
 */
export function Agenda({ status, period, q }: AgendaProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<AppointmentDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const appointments = useQuery(
    trpc.appointment.list.queryOptions({ status, period, q, limit: 200 }),
  );

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const items = appointments.data ?? [];

  // Grouped by day: an agenda read as one flat list of 40 rows is unusable,
  // and the day heading is what a provider actually scans for.
  const days = new Map<string, AppointmentDTO[]>();

  for (const appointment of items) {
    const key = formatWeekdayPtBR(appointment.scheduledAt);
    days.set(key, [...(days.get(key) ?? []), appointment]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Agenda</h1>
          <p className="text-muted-foreground">
            {items.length} {items.length === 1 ? "agendamento" : "agendamentos"}
          </p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <CalendarPlus size={16} />
          Novo agendamento
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <SearchBox value={q ?? ""} onCommit={(value) => setParam("q", value || null)} />

          <Select
            value={period}
            onValueChange={(value) => setParam("period", value === "all" ? null : value)}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar por período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status ?? "all"}
            onValueChange={(value) => setParam("status", value === "all" ? null : value)}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {appointments.isPending ? (
        <ListSkeleton count={4} />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarDays className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum agendamento com esses filtros</p>
            <p className="text-sm text-muted-foreground">
              Agendamentos feitos pelos tutores no Animalesko também aparecem aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...days].map(([day, dayAppointments]) => (
            <section key={day}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground capitalize">{day}</h2>
              <div className="space-y-3">
                {dayAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AppointmentForm open={creating} onOpenChange={setCreating} />

      <AppointmentDetails appointment={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SearchBox({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Adjusted during render rather than in an effect — the pattern the consumer
  // app's `ListingSearch` uses, for the same reason.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  // Debounced: every commit re-runs the query, so one request per typed word
  // rather than one per keystroke.
  useEffect(() => {
    if (draft === value) return;

    const timer = setTimeout(() => onCommit(draft.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="relative min-w-52 flex-1">
      <Search
        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        size={16}
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Cliente, animal ou serviço…"
        aria-label="Buscar na agenda"
        className="pl-10"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
}

function AppointmentCard({
  appointment,
  onSelect,
}: {
  appointment: AppointmentDTO;
  onSelect: (appointment: AppointmentDTO) => void;
}) {
  const status = appointment.status as AppointmentStatus;

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-brand-md">
      <CardContent className="flex items-center gap-4 p-4" onClick={() => onSelect(appointment)}>
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
          <span className="text-sm font-bold">{formatTimePtBR(appointment.scheduledAt)}</span>
          <span className="text-xs text-muted-foreground">{appointment.durationMinutes}min</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{appointmentClientLabel(appointment)}</p>
          <p className="truncate text-sm text-muted-foreground">{appointment.serviceLabel}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {appointment.pet ? (
              <span className="flex items-center gap-1">
                <Dog size={12} />
                {appointment.pet.name}
              </span>
            ) : null}
            {appointment.booking ? (
              <span className="font-mono">{appointment.booking.code}</span>
            ) : (
              <span>Presencial</span>
            )}
          </div>
        </div>

        <Badge variant={APPOINTMENT_STATUS_VARIANT[status]} className="shrink-0">
          {formatAppointmentStatus(status)}
        </Badge>
      </CardContent>
    </Card>
  );
}

function AppointmentDetails({
  appointment,
  onClose,
}: {
  appointment: AppointmentDTO | null;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const setStatus = useMutation(
    trpc.appointment.setStatus.mutationOptions({
      onSuccess: async (updated) => {
        toast.success(`Status alterado para ${formatAppointmentStatus(updated.status)}.`);
        onClose();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.appointment.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.organization.pathKey() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!appointment) return null;

  const status = appointment.status as AppointmentStatus;
  const phone = appointmentClientPhone(appointment);

  // Only the moves the state machine allows. The prototype offered every
  // status from every status, so a cancelled appointment could be "realizado".
  const nextStatuses = STATUS_TRANSITIONS[status];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment.serviceLabel}</DialogTitle>
          <DialogDescription>
            {formatWeekdayPtBR(appointment.scheduledAt)} às{" "}
            {formatTimePtBR(appointment.scheduledAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Row icon={User} label="Cliente">
            {appointmentClientLabel(appointment)}
            {isRegisteredClient(appointment) ? (
              <Badge variant="secondary" className="ml-2 text-xs">
                Tem conta
              </Badge>
            ) : null}
          </Row>

          {phone ? (
            <Row icon={Phone} label="Telefone">
              <a href={`tel:${phone}`} className="underline">
                {phone}
              </a>
            </Row>
          ) : null}

          {appointment.pet ? (
            <Row icon={Dog} label="Animal">
              {appointment.pet.name}
              {appointment.pet.breed ? ` · ${appointment.pet.breed}` : ""}
            </Row>
          ) : null}

          <Row icon={Clock} label="Duração">
            {appointment.durationMinutes} minutos
          </Row>

          {appointment.booking ? (
            <Row icon={FileText} label="Reserva">
              <span className="font-mono text-xs">{appointment.booking.code}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                Agendado pelo tutor no Animalesko
              </span>
            </Row>
          ) : null}

          {appointment.notes ? (
            <p className="rounded-lg bg-muted p-3">{appointment.notes}</p>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Status atual:{" "}
            <Badge variant={APPOINTMENT_STATUS_VARIANT[status]}>
              {formatAppointmentStatus(status)}
            </Badge>
          </p>

          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este agendamento está encerrado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant={next === "CANCELLED" ? "destructive" : "default"}
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: appointment.id, status: next })}
                >
                  {formatAppointmentStatus(next)}
                </Button>
              ))}
            </div>
          )}

          {appointment.booking ? (
            <p className="text-xs text-muted-foreground">
              O tutor é avisado automaticamente e a reserva dele acompanha esta mudança.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
