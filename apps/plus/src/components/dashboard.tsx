"use client";

import {
  formatAppointmentStatus,
  formatVaccinationStatus,
  vaccinationStatus,
} from "@animalesko/api/schemas";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  Dog,
  HeartHandshake,
  Heart,
  Sparkles,
  Star,
  Syringe,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppointmentForm } from "./appointment-form.tsx";
import { appointmentClientLabel } from "~/lib/appointment.ts";
import { formatTimePtBR } from "~/lib/display.ts";
import { usePlus } from "~/lib/org-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

import type { LucideIcon } from "lucide-react";

/**
 * The provider's landing screen.
 *
 * Every number is a real count. The prototype's four cards were
 * `pets.length` over a hardcoded array, `upcomingEvents.length` over another,
 * a literal `2` for "Pets Saudáveis", and `alerts.length` over two invented
 * warnings ("Ração acabará em 3 dias").
 */
export function Dashboard() {
  const trpc = useTRPC();
  const { org } = usePlus();
  const [newAppointment, setNewAppointment] = useState(false);

  const stats = useQuery(trpc.organization.stats.queryOptions());
  const today = useQuery(trpc.appointment.list.queryOptions({ period: "today", limit: 20 }));
  const dueVaccines = useQuery(trpc.clinical.dueVaccinations.queryOptions({ withinDays: 30 }));

  const counts = stats.data;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-hero p-6 text-gradient-foreground shadow-brand-lg">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <p className="text-gradient-foreground/90">
          Tudo que você publica aqui aparece para os tutores no Animalesko.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Hoje na agenda"
          value={counts?.appointmentsToday}
          icon={CalendarDays}
          tone="primary"
        />
        <Stat
          label="Animais sob guarda"
          value={counts?.animalsInCustody}
          icon={Dog}
          tone="primary"
        />
        <Stat
          label="Serviços ativos"
          value={counts?.activeOfferings}
          icon={Sparkles}
          tone="secondary"
        />
        <Stat
          label="A confirmar"
          value={counts?.pendingAppointments}
          icon={AlertTriangle}
          tone={counts?.pendingAppointments ? "warning" : "muted"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Agenda de hoje</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {today.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : today.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum atendimento hoje. Bom dia para colocar a papelada em dia 🐾
              </p>
            ) : (
              today.data?.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="text-sm font-bold">
                      {formatTimePtBR(appointment.scheduledAt)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{appointment.serviceLabel}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {appointmentClientLabel(appointment)}
                      {appointment.pet ? ` · ${appointment.pet.name}` : ""}
                    </p>
                  </div>

                  <Badge
                    variant={appointment.status === "CONFIRMED" ? "success" : "warning"}
                    className="shrink-0"
                  >
                    {formatAppointmentStatus(appointment.status)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Vacinas a vencer</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/animais">Ver animais</Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {dueVaccines.isPending ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : dueVaccines.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum reforço nos próximos 30 dias.
              </p>
            ) : (
              dueVaccines.data?.map((vaccine) => {
                const status = vaccinationStatus(vaccine.nextDoseAt);

                return (
                  <div
                    key={vaccine.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-3",
                      status === "ATRASADA"
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-warning/40 bg-warning/5",
                    )}
                  >
                    <Syringe size={18} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{vaccine.pet.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {vaccine.name} ·{" "}
                        {vaccine.daysUntilDue < 0
                          ? `${Math.abs(vaccine.daysUntilDue)} dias em atraso`
                          : `em ${vaccine.daysUntilDue} dias`}
                      </p>
                    </div>
                    <Badge
                      variant={status === "ATRASADA" ? "destructive" : "warning"}
                      className="shrink-0"
                    >
                      {formatVaccinationStatus(status)}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {org.isShelter && counts ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Adoção</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/adocao">Gerenciar anúncios</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Stat
              label="Anúncios publicados"
              value={counts.availableListings}
              icon={HeartHandshake}
              tone="primary"
            />
            <Stat
              label="Candidaturas abertas"
              value={counts.openApplications}
              icon={Heart}
              tone={counts.openApplications ? "secondary" : "muted"}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Button className="h-16 flex-col gap-1" onClick={() => setNewAppointment(true)}>
            <CalendarPlus size={20} />
            <span className="text-sm">Agendar</span>
          </Button>
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/animais">
              <Dog size={20} />
              <span className="text-sm">Animais</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/servicos">
              <Sparkles size={20} />
              <span className="text-sm">Serviços</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16 flex-col gap-1">
            <Link href="/organizacao">
              <Star size={20} />
              <span className="text-sm">
                {counts?.ratingCount ? `${counts.ratingAvg.toFixed(1)} ★` : "Perfil"}
              </span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      <AppointmentForm open={newAppointment} onOpenChange={setNewAppointment} />
    </div>
  );
}

const TONES = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  warning: "bg-warning text-warning-foreground",
  muted: "bg-muted text-muted-foreground",
} as const;

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  tone: keyof typeof TONES;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            TONES[tone],
          )}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{value ?? "—"}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
