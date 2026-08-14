"use client";

import {
  createPetSchema,
  type CreatePetFormValues,
  type CreatePetInput,
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useTRPC } from "~/trpc/react.tsx";

import type { PetDTO } from "@animalesko/api";

const SPECIES_LABELS = {
  DOG: "🐕 Cão",
  CAT: "🐱 Gato",
  BIRD: "🐦 Ave",
  RODENT: "🐹 Roedor",
  REPTILE: "🦎 Réptil",
  FISH: "🐠 Peixe",
  OTHER: "Outro",
} as const;

const HEALTH_LABELS = {
  EXCELLENT: "✅ Excelente",
  GOOD: "😊 Bom",
  ATTENTION: "⚠️ Necessita atenção",
  URGENT: "🚨 Urgente",
} as const;

const SEX_LABELS = { MALE: "Macho", FEMALE: "Fêmea", UNKNOWN: "Não informado" } as const;

const SIZE_LABELS = { SMALL: "Pequeno", MEDIUM: "Médio", LARGE: "Grande" } as const;

interface PetFormProps {
  /** The pet being edited, or `null` to register a new one. */
  pet?: PetDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The form's shape, derived from a pet or from the registration defaults. */
function valuesFor(pet: PetDTO | null | undefined): CreatePetFormValues {
  if (!pet) {
    return {
      name: "",
      species: "DOG",
      breed: "",
      sex: "UNKNOWN",
      healthStatus: "GOOD",
      temperament: [],
      neutered: false,
    };
  }

  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? "",
    sex: pet.sex,
    size: pet.size,
    birthDate: pet.birthDate,
    weightKg: pet.weightKg,
    healthStatus: pet.healthStatus,
    notes: pet.notes ?? "",
    temperament: pet.temperament,
    neutered: pet.neutered,
    microchip: pet.microchip,
  };
}

export function PetForm({ pet, open, onOpenChange }: PetFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEditing = Boolean(pet);

  // The exact schema the server validates with — one definition, so the form
  // cannot accept something the API will reject. The three generics are
  // <held values, context, parsed values>: defaults make those first and third
  // types differ, and handleSubmit hands the mutation the parsed one.
  const form = useForm<CreatePetFormValues, unknown, CreatePetInput>({
    resolver: zodResolver(createPetSchema),
    defaultValues: valuesFor(pet),
  });

  // `defaultValues` is read once at mount, and this dialog is kept mounted
  // between openings, so switching which pet is being edited has to reset the
  // form explicitly.
  useEffect(() => {
    if (open) form.reset(valuesFor(pet));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pet?.id]);

  /** Both mutations report failures the same way. */
  function handleError(error: {
    message: string;
    data?: { zodError?: { fieldErrors?: Record<string, string[] | undefined> } | null } | null;
  }) {
    // Field-level errors from the server land back on the right input.
    const fieldErrors = error.data?.zodError?.fieldErrors;

    if (fieldErrors) {
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages?.[0];
        if (message) {
          form.setError(field as keyof CreatePetFormValues, { message });
        }
      }
      return;
    }

    toast.error(error.message);
  }

  async function onSaved(saved: { name: string }, verb: string) {
    toast.success(`${saved.name} foi ${verb}!`);
    onOpenChange(false);
    await queryClient.invalidateQueries({ queryKey: trpc.pet.pathKey() });
  }

  const createPet = useMutation(
    trpc.pet.create.mutationOptions({
      onSuccess: (saved) => onSaved(saved, "cadastrado"),
      onError: handleError,
    }),
  );

  const updatePet = useMutation(
    trpc.pet.update.mutationOptions({
      onSuccess: (saved) => onSaved(saved, "atualizado"),
      onError: handleError,
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar ${pet?.name}` : "Cadastrar novo pet"}</DialogTitle>
          <DialogDescription>Os campos marcados com * são obrigatórios.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              pet ? updatePet.mutate({ id: pet.id, ...values }) : createPet.mutate(values),
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do pet *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Rex, Mimi…" {...field} />
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
                        {Object.entries(SPECIES_LABELS).map(([value, label]) => (
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
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raça</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Golden Retriever"
                        {...field}
                        value={field.value ?? ""}
                      />
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
                        {Object.entries(SEX_LABELS).map(([value, label]) => (
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
                        {Object.entries(SIZE_LABELS).map(([value, label]) => (
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
                    <FormLabel>Data de nascimento</FormLabel>
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
                    <FormDescription>A idade é calculada a partir desta data.</FormDescription>
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
                        placeholder="Ex: 15.5"
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
                    <FormLabel>Status de saúde</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(HEALTH_LABELS).map(([value, label]) => (
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
                      placeholder="Alergias, medicamentos, comportamento…"
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
              <Button type="submit" loading={createPet.isPending || updatePet.isPending}>
                {isEditing ? "Salvar alterações" : "Cadastrar pet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
