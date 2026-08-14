"use client";

import {
  createAppointmentSchema,
  SERVICE_SUGGESTIONS,
  type CreateAppointmentFormValues,
  type CreateAppointmentInput,
} from "@animalesko/api/schemas";
import {
  Button,
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
  Textarea,
  toast,
} from "@animalesko/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { SPECIES_EMOJI } from "~/lib/display.ts";
import { useTRPC } from "~/trpc/react.tsx";

/** Half-hour slots from 08:00 to 18:30, as the prototype offered. */
const TIME_SLOTS = Array.from({ length: 22 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const DURATIONS = [
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 horas" },
];

const NEW_CLIENT = "__new__";
const NO_PET = "__none__";

function localDateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Booking a walk-in into the agenda.
 *
 * The prototype collected `clientName` + `phone` as free text on every
 * appointment, so the same person booking twice produced two unrelated records.
 * Here the client is either picked from `ClientContact` or created once and
 * reused — deduped on `(orgId, phone)` by the server.
 */
export function AppointmentForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [day, setDay] = useState(() => localDateInput(new Date()));
  const [time, setTime] = useState("09:00");
  const [clientMode, setClientMode] = useState<string>(NEW_CLIENT);

  const clients = useQuery({ ...trpc.clientContact.list.queryOptions({}), enabled: open });
  const animals = useQuery({ ...trpc.animal.list.queryOptions({}), enabled: open });

  const form = useForm<CreateAppointmentFormValues, unknown, CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      serviceLabel: SERVICE_SUGGESTIONS[0],
      durationMinutes: 60,
      scheduledAt: new Date(),
      notes: "",
      newClient: { name: "", phone: "", email: "" },
    },
  });

  const createAppointment = useMutation(
    trpc.appointment.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Agendamento criado.");
        form.reset();
        onOpenChange(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.appointment.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.clientContact.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.organization.pathKey() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>Os campos marcados com * são obrigatórios.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              const [hours, minutes] = time.split(":").map(Number);
              const scheduledAt = new Date(`${day}T00:00:00`);
              scheduledAt.setHours(hours ?? 9, minutes ?? 0, 0, 0);

              createAppointment.mutate({ ...values, scheduledAt });
            })}
          >
            <FormField
              control={form.control}
              name="serviceLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço *</FormLabel>
                  <FormControl>
                    <Input list="service-suggestions" placeholder="Ex: Consulta" {...field} />
                  </FormControl>
                  {/* Suggestions rather than an enum: an appointment can be for
                      something the organization never published as an offering. */}
                  <datalist id="service-suggestions">
                    {SERVICE_SUGGESTIONS.map((service) => (
                      <option key={service} value={service} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormItem className="col-span-1">
                <FormLabel>Data *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={day}
                    min={localDateInput(new Date())}
                    onChange={(event) => setDay(event.target.value)}
                  />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Horário *</FormLabel>
                <Select value={time} onValueChange={setTime}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração</FormLabel>
                    <Select
                      value={String(field.value ?? 60)}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Cliente *</FormLabel>
              <Select
                value={clientMode}
                onValueChange={(value) => {
                  setClientMode(value);

                  // The contract refuses both at once, so switching mode has to
                  // clear the other side.
                  if (value === NEW_CLIENT) {
                    form.setValue("clientContactId", null);
                    form.setValue("newClient", { name: "", phone: "", email: "" });
                  } else {
                    form.setValue("clientContactId", value);
                    form.setValue("newClient", null);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NEW_CLIENT}>+ Novo cliente</SelectItem>
                  {clients.data?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} · {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>

            {clientMode === NEW_CLIENT ? (
              <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="newClient.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newClient.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newClient.email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="petId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Animal</FormLabel>
                  <Select
                    value={field.value ?? NO_PET}
                    onValueChange={(value) => field.onChange(value === NO_PET ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PET}>Não informar</SelectItem>
                      {animals.data?.map((animal) => (
                        <SelectItem key={animal.id} value={animal.id}>
                          {SPECIES_EMOJI[animal.species]} {animal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Só aparecem animais que já passaram por aqui ou estão sob sua guarda.
                  </FormDescription>
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
              <Button type="submit" loading={createAppointment.isPending}>
                Agendar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
