"use client";

import {
  createHealthRecordSchema,
  createReminderSchema,
  createVaccinationSchema,
  formatAgePtBR,
  formatAnimalRelation,
  formatReminderType,
  formatVaccinationStatus,
  reminderTypeSchema,
  VACCINE_SUGGESTIONS,
  vaccinationStatus,
  type CreateHealthRecordFormValues,
  type CreateHealthRecordInput,
  type CreateReminderFormValues,
  type CreateReminderInput,
  type CreateVaccinationFormValues,
  type CreateVaccinationInput,
  type ReminderType,
} from "@animalesko/api/schemas";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
  toast,
} from "@animalesko/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Heart,
  Plus,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { HEALTH_BADGE, REMINDER_ICON, VACCINATION_BADGE } from "~/lib/clinical.ts";
import {
  formatDatePtBR,
  formatDateTimePtBR,
  SPECIES_EMOJI,
  SPECIES_LABELS,
} from "~/lib/display.ts";
import { useTRPC } from "~/trpc/react.tsx";

import type { AnimalDTO } from "@animalesko/api";

/**
 * One animal's file.
 *
 * The prototype's `HealthRecordForm`, `VaccineManager` and `ReminderForm` each
 * ended in `console.log(...)` and a success toast. These write rows.
 */
export function AnimalDetail({ animal }: { animal: AnimalDTO }) {
  const health = HEALTH_BADGE[animal.healthStatus];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/animais">
          <ArrowLeft size={16} />
          Todos os animais
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-primary">
              {SPECIES_EMOJI[animal.species]} {animal.name}
            </h1>
            <p className="text-muted-foreground">
              {animal.breed ?? SPECIES_LABELS[animal.species]} · {formatAgePtBR(animal.birthDate)}
              {animal.weightKg ? ` · ${animal.weightKg} kg` : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={health.variant}>{health.label}</Badge>
              <Badge variant={animal.relation === "CUSTODY" ? "default" : "outline"}>
                {formatAnimalRelation(animal.relation)}
              </Badge>
              {animal.neutered ? <Badge variant="outline">Castrado</Badge> : null}
              {animal.microchip ? (
                <Badge variant="outline" className="font-mono text-xs">
                  {animal.microchip}
                </Badge>
              ) : null}
            </div>

            {animal.notes ? (
              <p className="mt-3 max-w-prose rounded-lg bg-muted p-3 text-sm">{animal.notes}</p>
            ) : null}
          </div>

          {animal.listing ? (
            <Button asChild variant="outline">
              <Link href={`/adocao/${animal.listing.id}`}>Ver anúncio</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">
            <Stethoscope size={14} />
            Saúde
          </TabsTrigger>
          <TabsTrigger value="vaccines">
            <Syringe size={14} />
            Vacinas
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock size={14} />
            Lembretes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <HealthRecords petId={animal.id} />
        </TabsContent>
        <TabsContent value="vaccines">
          <Vaccinations petId={animal.id} />
        </TabsContent>
        <TabsContent value="reminders">
          <Reminders petId={animal.id} petName={animal.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Health records ----------------------------------------------------------

function HealthRecords({ petId }: { petId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const records = useQuery(trpc.clinical.healthRecords.queryOptions({ petId }));

  const remove = useMutation(
    trpc.clinical.deleteHealthRecord.mutationOptions({
      onSuccess: async () => {
        toast.success("Registro removido.");
        await queryClient.invalidateQueries({ queryKey: trpc.clinical.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const items = records.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Histórico clínico</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} />
          Registrar
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {records.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          items.map((record) => (
            <div key={record.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatDatePtBR(record.recordedAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.org?.name}
                    {record.author ? ` · ${record.author.name}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover registro"
                  className="size-8 text-destructive"
                  onClick={() => remove.mutate({ id: record.id })}
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {record.weightKg ? <Badge variant="outline">{record.weightKg} kg</Badge> : null}
                {record.temperatureC ? (
                  <Badge variant="outline">{record.temperatureC} °C</Badge>
                ) : null}
              </div>

              {record.symptoms ? <p className="mt-2 text-sm">{record.symptoms}</p> : null}
              {record.notes ? (
                <p className="mt-1 text-sm text-muted-foreground">{record.notes}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>

      <HealthRecordForm petId={petId} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function HealthRecordForm({
  petId,
  open,
  onOpenChange,
}: {
  petId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateHealthRecordFormValues, unknown, CreateHealthRecordInput>({
    resolver: zodResolver(createHealthRecordSchema),
    defaultValues: { petId, recordedAt: new Date(), symptoms: "", notes: "" },
  });

  const create = useMutation(
    trpc.clinical.addHealthRecord.mutationOptions({
      onSuccess: async () => {
        toast.success("Registro salvo.");
        form.reset({ petId, recordedAt: new Date(), symptoms: "", notes: "" });
        onOpenChange(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.clinical.pathKey() }),
          // A recorded weight also updates the animal itself.
          queryClient.invalidateQueries({ queryKey: trpc.animal.pathKey() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart size={18} className="text-primary" />
            Registrar saúde
          </DialogTitle>
          <DialogDescription>O peso informado também atualiza a ficha do animal.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <FormField
              control={form.control}
              name="recordedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={
                        field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""
                      }
                      onChange={(event) =>
                        field.onChange(event.target.value ? new Date(event.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? null : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperatureC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? null : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sintomas</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={create.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Vaccinations ------------------------------------------------------------

function Vaccinations({ petId }: { petId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const vaccinations = useQuery(trpc.clinical.vaccinations.queryOptions({ petId }));

  const remove = useMutation(
    trpc.clinical.deleteVaccination.mutationOptions({
      onSuccess: async () => {
        toast.success("Vacina removida.");
        await queryClient.invalidateQueries({ queryKey: trpc.clinical.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const items = vaccinations.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Carteira de vacinação</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} />
          Registrar dose
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {vaccinations.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma vacina registrada.
          </p>
        ) : (
          items.map((vaccine) => {
            // Derived at render, never stored — the prototype's saved status
            // was already wrong in its own mock data.
            const status = vaccinationStatus(vaccine.nextDoseAt);

            return (
              <div
                key={vaccine.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border p-3",
                  status === "ATRASADA" && "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{vaccine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Aplicada em {formatDatePtBR(vaccine.appliedAt)}
                    {vaccine.nextDoseAt
                      ? ` · reforço em ${formatDatePtBR(vaccine.nextDoseAt)}`
                      : ""}
                  </p>
                  {vaccine.veterinarian ? (
                    <p className="text-xs text-muted-foreground">{vaccine.veterinarian}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={VACCINATION_BADGE[status]}>
                    {formatVaccinationStatus(status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${vaccine.name}`}
                    className="size-8 text-destructive"
                    onClick={() => remove.mutate({ id: vaccine.id })}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <VaccinationForm petId={petId} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function VaccinationForm({
  petId,
  open,
  onOpenChange,
}: {
  petId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateVaccinationFormValues, unknown, CreateVaccinationInput>({
    resolver: zodResolver(createVaccinationSchema),
    defaultValues: { petId, name: "", appliedAt: new Date(), veterinarian: "", batch: "" },
  });

  const create = useMutation(
    trpc.clinical.addVaccination.mutationOptions({
      onSuccess: async () => {
        toast.success("Vacina registrada.");
        form.reset({ petId, name: "", appliedAt: new Date(), veterinarian: "", batch: "" });
        onOpenChange(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.clinical.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.organization.pathKey() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe size={18} className="text-primary" />
            Registrar vacina
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vacina *</FormLabel>
                  <FormControl>
                    <Input list="vaccine-suggestions" placeholder="Ex: V10" {...field} />
                  </FormControl>
                  <datalist id="vaccine-suggestions">
                    {VACCINE_SUGGESTIONS.map((vaccine) => (
                      <option key={vaccine} value={vaccine} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="appliedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aplicada em *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={
                          field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""
                        }
                        onChange={(event) =>
                          field.onChange(event.target.value ? new Date(event.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextDoseAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próxima dose</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""
                        }
                        onChange={(event) =>
                          field.onChange(event.target.value ? new Date(event.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>Deixe vazio para dose única.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="veterinarian"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veterinário</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={create.isPending}>
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Reminders ---------------------------------------------------------------

function Reminders({ petId, petName }: { petId: string; petName: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const reminders = useQuery(
    trpc.reminder.list.queryOptions({ petId, includeCompleted: true, limit: 50 }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.reminder.pathKey() });

  const complete = useMutation(trpc.reminder.complete.mutationOptions({ onSuccess: invalidate }));
  const remove = useMutation(
    trpc.reminder.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Lembrete removido.");
        void invalidate();
      },
    }),
  );

  const items = reminders.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Lembretes</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} />
          Novo lembrete
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Lembretes são seus, não da organização — seus colegas não os veem.
        </p>

        {reminders.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lembrete para {petName}.
          </p>
        ) : (
          items.map((reminder) => (
            <div
              key={reminder.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                reminder.completedAt && "opacity-60",
              )}
            >
              <Button
                variant={reminder.completedAt ? "success" : "outline"}
                size="icon"
                aria-label={reminder.completedAt ? "Reabrir lembrete" : "Concluir lembrete"}
                className="size-8 shrink-0"
                onClick={() => complete.mutate({ id: reminder.id })}
              >
                <Check size={14} />
              </Button>

              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", reminder.completedAt && "line-through")}>
                  {REMINDER_ICON[reminder.type as ReminderType]} {reminder.title}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays size={12} />
                  {formatDateTimePtBR(reminder.dueAt)} ·{" "}
                  {formatReminderType(reminder.type as ReminderType)}
                </p>
                {reminder.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{reminder.description}</p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover lembrete"
                className="size-8 shrink-0 text-destructive"
                onClick={() => remove.mutate({ id: reminder.id })}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <ReminderForm petId={petId} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function ReminderForm({
  petId,
  open,
  onOpenChange,
}: {
  petId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateReminderFormValues, unknown, CreateReminderInput>({
    resolver: zodResolver(createReminderSchema),
    defaultValues: { petId, type: "GENERAL", title: "", description: "" },
  });

  // "Tomorrow" is computed on open rather than in `defaultValues`: reading the
  // clock during render is impure, and it also means the second reminder of
  // the day no longer defaults to the first one's date.
  useEffect(() => {
    if (!open) return;

    form.reset({
      petId,
      type: "GENERAL",
      title: "",
      description: "",
      dueAt: new Date(Date.now() + 86_400_000),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, petId]);

  const create = useMutation(
    trpc.reminder.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Lembrete criado.");
        form.reset();
        onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: trpc.reminder.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function toLocalInput(date: Date): string {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            Novo lembrete
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Segunda dose do vermífugo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reminderTypeSchema.options.map((option: ReminderType) => (
                          <SelectItem key={option} value={option}>
                            {REMINDER_ICON[option]} {formatReminderType(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quando *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value instanceof Date ? toLocalInput(field.value) : ""}
                        onChange={(event) =>
                          field.onChange(event.target.value ? new Date(event.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={create.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
