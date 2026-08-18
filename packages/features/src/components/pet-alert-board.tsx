"use client";

import {
  createAlertSchema,
  formatAlertStatus,
  speciesSchema,
  type CreateAlertFormValues,
  type CreateAlertInput,
  type Species,
} from "@animalesko/api/schemas";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { CheckCircle2, Eye, MapPin, Phone, Plus, Siren } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { formatDatePtBR, SPECIES_EMOJI, SPECIES_LABELS } from "../lib/display.ts";
import { getPlatform } from "../lib/platform.ts";
import { useSession } from "../lib/session-context.tsx";
import { useTRPC } from "../trpc.ts";

import type { AlertDTO } from "@animalesko/api";

/**
 * Leaflet reaches for `window` at import time, so the map must never be part of
 * the server bundle.
 */
const AlertMap = dynamic(() => import("./alert-map.tsx").then((mod) => mod.AlertMap), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Carregando mapa…
    </div>
  ),
});

/** Central São Paulo, used until (or unless) geolocation resolves. */
const FALLBACK_CENTER: [number, number] = [-23.5505, -46.6333];

export function PetAlertBoard() {
  const trpc = useTRPC();
  const router = useRouter();
  const { signedIn } = useSession();

  const [center, setCenter] = useState<[number, number]>(FALLBACK_CENTER);
  const [species, setSpecies] = useState<Species | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<AlertDTO | null>(null);

  // Asked for once, on mount. Denying it — or having no Geolocation API at all
  // — is a normal outcome rather than an error: the board still works, centred
  // on the fallback. Nothing is set synchronously here, only from the resolved
  // promise, so this does not cascade a render.
  //
  // Goes through the platform adapter because the native build has to ask
  // Capacitor, which in turn triggers the OS permission sheet.
  useEffect(() => {
    let cancelled = false;

    void getPlatform()
      .getCurrentPosition()
      .then((position) => {
        if (cancelled || !position) return;
        setCenter([position.latitude, position.longitude]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const alerts = useQuery(
    trpc.alert.list.queryOptions({
      ...(species === "all" ? {} : { species }),
      near: { latitude: center[0], longitude: center[1], radiusKm: 100 },
      limit: 100,
    }),
  );

  const items = alerts.data ?? [];

  function requireSignIn(): boolean {
    if (signedIn) return false;
    router.push("/entrar?next=/pet-alert");
    return true;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={species} onValueChange={(value) => setSpecies(value as Species | "all")}>
            <SelectTrigger className="w-40" aria-label="Filtrar por espécie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as espécies</SelectItem>
              {speciesSchema.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {SPECIES_EMOJI[option]} {SPECIES_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="ml-auto"
            onClick={() => {
              if (requireSignIn()) return;
              setCreateOpen(true);
            }}
          >
            <Plus size={16} />
            Registrar
          </Button>
        </div>

        <div className="h-72 overflow-hidden rounded-xl border shadow-brand-md">
          <AlertMap alerts={items} center={center} onSelect={setSelected} />
        </div>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Siren size={18} className="text-destructive" />
            {items.length === 0
              ? "Nenhum alerta por perto"
              : `${items.length} ${items.length === 1 ? "alerta" : "alertas"} por perto`}
          </h2>

          {items.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Boa notícia — nenhum pet perdido registrado nesta região. Se você perdeu o seu,
                registre um alerta e todo mundo por perto passa a vê-lo.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onSelect={setSelected} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreateAlertDialog open={createOpen} onOpenChange={setCreateOpen} center={center} />

      <AlertDetailsDialog
        alert={selected}
        onClose={() => setSelected(null)}
        requireSignIn={requireSignIn}
      />
    </>
  );
}

function AlertCard({ alert, onSelect }: { alert: AlertDTO; onSelect: (alert: AlertDTO) => void }) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-brand-md">
      <CardContent className="space-y-2 p-4" onClick={() => onSelect(alert)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">
              {SPECIES_EMOJI[alert.species]} {alert.name}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {alert.breed ?? SPECIES_LABELS[alert.species]}
            </p>
          </div>
          <Badge variant={alert.status === "LOST" ? "destructive" : "success"} className="shrink-0">
            {formatAlertStatus(alert.status)}
          </Badge>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{alert.description}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {alert.lastSeenAddress}
          </span>
          <span>Visto em {formatDatePtBR(alert.lastSeenAt)}</span>
          {alert._count.sightings > 0 ? (
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {alert._count.sightings}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertDetailsDialog({
  alert,
  onClose,
  requireSignIn,
}: {
  alert: AlertDTO | null;
  onClose: () => void;
  requireSignIn: () => boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const [note, setNote] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.alert.pathKey() });

  const reportSighting = useMutation(
    trpc.alert.reportSighting.mutationOptions({
      onSuccess: () => {
        toast.success("Avistamento registrado! 🚨", {
          description: "O tutor foi avisado. +50 Pontos Aumigos.",
        });
        setNote("");
        onClose();
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: trpc.gamification.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const resolveAlert = useMutation(
    trpc.alert.resolve.mutationOptions({
      onSuccess: () => {
        toast.success("Que ótima notícia! 💚");
        onClose();
        void invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!alert) return null;

  const isReporter = alert.reporter.id === userId;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {SPECIES_EMOJI[alert.species]} {alert.name}
          </DialogTitle>
          <DialogDescription>
            Visto pela última vez em {alert.lastSeenAddress}, {formatDatePtBR(alert.lastSeenAt)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm">{alert.description}</p>

          <Card className="bg-muted/50">
            <CardContent className="space-y-1 p-3 text-sm">
              <p className="font-medium">Contato</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone size={14} />
                <a href={`tel:${alert.contactPhone}`} className="underline">
                  {alert.contactPhone}
                </a>{" "}
                — {alert.contactName}
              </p>
            </CardContent>
          </Card>

          {isReporter ? (
            <Button
              className="w-full"
              variant="success"
              loading={resolveAlert.isPending}
              onClick={() => resolveAlert.mutate({ id: alert.id, status: "FOUND" })}
            >
              <CheckCircle2 size={16} />
              Encontrei meu pet!
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Você viu {alert.name}?</p>
              <Textarea
                rows={2}
                placeholder="Onde e quando você viu, se estava sozinho…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button
                className="w-full"
                loading={reportSighting.isPending}
                onClick={() => {
                  if (requireSignIn()) return;

                  // Reported at the animal's last-known point rather than the
                  // finder's current position: they are usually filling this in
                  // after they have walked on.
                  reportSighting.mutate({
                    alertId: alert.id,
                    latitude: alert.lastSeenLat,
                    longitude: alert.lastSeenLng,
                    address: alert.lastSeenAddress,
                    note: note.trim() || null,
                    sightedAt: new Date(),
                  });
                }}
              >
                <Eye size={16} />
                Avistei este pet
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateAlertDialog({
  open,
  onOpenChange,
  center,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: [number, number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateAlertFormValues, unknown, CreateAlertInput>({
    resolver: zodResolver(createAlertSchema),
    defaultValues: {
      name: "",
      species: "DOG",
      breed: "",
      description: "",
      lastSeenAddress: "",
      lastSeenAt: new Date(),
      contactName: "",
      contactPhone: "",
      photoUrls: [],
      lastSeenLat: center[0],
      lastSeenLng: center[1],
    },
  });

  // The coordinates are not fields — they come from the map's current centre,
  // which only settles once geolocation resolves. `setValue` writes to
  // react-hook-form's own store rather than React state, so this is a genuine
  // "sync an external system" effect.
  const [latitude, longitude] = center;

  useEffect(() => {
    form.setValue("lastSeenLat", latitude);
    form.setValue("lastSeenLng", longitude);
  }, [form, latitude, longitude]);

  const createAlert = useMutation(
    trpc.alert.create.mutationOptions({
      onSuccess: async (alert) => {
        toast.success(`Alerta de ${alert.name} publicado 🚨`, {
          description: "Todo mundo por perto já consegue ver.",
        });
        form.reset();
        onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: trpc.alert.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pet perdido</DialogTitle>
          <DialogDescription>
            O alerta fica visível para todo mundo na região — foi exatamente isso que a versão
            anterior, guardada só no navegador, não conseguia fazer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => createAlert.mutate(values))}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pretinha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Espécie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {speciesSchema.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {SPECIES_EMOJI[option]} {SPECIES_LABELS[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raça</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Vira-lata" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Cor, coleira, comportamento, marcas…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastSeenAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onde foi visto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Paulista, próximo ao MASP" {...field} />
                  </FormControl>
                  <FormDescription>
                    O alerta é marcado no mapa na sua localização atual.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastSeenAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quando *</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      max={toLocalInput(new Date())}
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
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
              <Button type="submit" loading={createAlert.isPending}>
                Publicar alerta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * `datetime-local` wants local wall-clock time; `toISOString()` is UTC, which
 * on a UTC-3 machine offers a default three hours in the future and trips the
 * "não pode estar no futuro" rule.
 */
function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
