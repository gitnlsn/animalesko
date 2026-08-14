"use client";

import {
  createAnimalSchema,
  formatAgePtBR,
  formatAnimalRelation,
  speciesSchema,
  type AnimalRelation,
  type CreateAnimalFormValues,
  type CreateAnimalInput,
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
import { Dog, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { HEALTH_BADGE } from "~/lib/clinical.ts";
import { SPECIES_EMOJI, SPECIES_LABELS } from "~/lib/display.ts";
import { usePlus } from "~/lib/org-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

const ALL = "all";

const RELATIONS: { value: AnimalRelation | typeof ALL; label: string }[] = [
  { value: ALL, label: "Todos os animais" },
  { value: "CUSTODY", label: "Sob nossa guarda" },
  { value: "PATIENT", label: "Pacientes" },
];

/**
 * The animals this organization is responsible for.
 *
 * Not the signed-in user's own pets — that is the consumer app's `/meus-pets`.
 * The prototype's Plus "Meus Pets" tab listed Rex and Mimi, the tutor's two
 * animals, which is what made its clinical forms conceptually homeless.
 */
export function AnimalsPanel() {
  const trpc = useTRPC();
  const { org } = usePlus();

  const [relation, setRelation] = useState<AnimalRelation | typeof ALL>(ALL);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const animals = useQuery(
    trpc.animal.list.queryOptions({
      ...(relation === ALL ? {} : { relation }),
      q: debounced || undefined,
      limit: 200,
    }),
  );

  const items = animals.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Animais</h1>
          <p className="text-muted-foreground">Sob sua guarda e os que passam por aqui</p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          {org.isShelter ? "Registrar resgate" : "Registrar animal"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1 md:max-w-sm">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            size={16}
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Nome ou raça…"
            aria-label="Buscar animais"
            className="pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select
          value={relation}
          onValueChange={(value) => setRelation(value as AnimalRelation | typeof ALL)}
        >
          <SelectTrigger className="w-52" aria-label="Filtrar por relação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {animals.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Dog className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum animal por aqui</p>
            <p className="text-sm text-muted-foreground">
              Animais aparecem quando você os registra ou quando atendem um agendamento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((animal) => {
            const health = HEALTH_BADGE[animal.healthStatus];

            return (
              <Card key={animal.id} className="transition-shadow hover:shadow-brand-md">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/animais/${animal.id}`} className="hover:underline">
                        <h2 className="truncate text-lg font-semibold">
                          {SPECIES_EMOJI[animal.species]} {animal.name}
                        </h2>
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {animal.breed ?? SPECIES_LABELS[animal.species]} ·{" "}
                        {formatAgePtBR(animal.birthDate)}
                      </p>
                    </div>
                    <Badge variant={health.variant} className="shrink-0">
                      {health.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={animal.relation === "CUSTODY" ? "default" : "outline"}>
                      {formatAnimalRelation(animal.relation)}
                    </Badge>
                    {animal.listing ? <Badge variant="secondary">Anunciado</Badge> : null}
                    {animal.weightKg ? <Badge variant="outline">{animal.weightKg} kg</Badge> : null}
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/animais/${animal.id}`}>Abrir ficha</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AnimalForm open={creating} onOpenChange={setCreating} />
    </div>
  );
}

const SEX_OPTIONS = { MALE: "Macho", FEMALE: "Fêmea", UNKNOWN: "Não informado" } as const;
const SIZE_OPTIONS = { SMALL: "Pequeno", MEDIUM: "Médio", LARGE: "Grande" } as const;

/** Registering an animal the organization takes into custody. */
function AnimalForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateAnimalFormValues, unknown, CreateAnimalInput>({
    resolver: zodResolver(createAnimalSchema),
    defaultValues: {
      name: "",
      species: "DOG",
      breed: "",
      sex: "UNKNOWN",
      healthStatus: "GOOD",
      temperament: [],
      neutered: false,
    },
  });

  const create = useMutation(
    trpc.animal.create.mutationOptions({
      onSuccess: async (animal) => {
        toast.success(`${animal.name} foi registrado.`);
        form.reset();
        onOpenChange(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.animal.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.organization.pathKey() }),
        ]);
      },
      onError: (error) => {
        const fieldErrors = error.data?.zodError?.fieldErrors;

        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            const message = messages?.[0];
            if (message) form.setError(field as keyof CreateAnimalFormValues, { message });
          }
          return;
        }

        toast.error(error.message);
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar animal</DialogTitle>
          <DialogDescription>
            O animal fica sob a guarda da sua organização até ser adotado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Luna" {...field} />
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
                        {speciesSchema.options.map((option: Species) => (
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

              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raça</FormLabel>
                    <FormControl>
                      <Input placeholder="SRD" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SEX_OPTIONS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porte</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SIZE_OPTIONS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nascimento (estimado)</FormLabel>
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
                    <FormDescription>A idade é calculada a partir daqui.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                name="healthStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de saúde</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(HEALTH_BADGE).map(([value, badge]) => (
                          <SelectItem key={value} value={value}>
                            {badge.label}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Como chegou, comportamento, tratamentos em curso…"
                      {...field}
                      value={field.value ?? ""}
                    />
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
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
