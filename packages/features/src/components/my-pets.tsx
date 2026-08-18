"use client";

import { formatAgePtBR } from "@animalesko/api/schemas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ListSkeleton,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, PawPrint, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { PetForm } from "./pet-form.tsx";
import { SPECIES_EMOJI, SPECIES_LABELS } from "../lib/display.ts";
import { MY_PETS_LIST_INPUT } from "../lib/query-inputs.ts";
import { useTRPC } from "../trpc.ts";

import type { PetDTO } from "@animalesko/api";

const HEALTH_BADGE = {
  EXCELLENT: { label: "Excelente", variant: "success" },
  GOOD: { label: "Bom", variant: "default" },
  ATTENTION: { label: "Atenção", variant: "warning" },
  URGENT: { label: "Urgente", variant: "destructive" },
} as const;

export function MyPets() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // `null` means the form is closed; a pet means edit, `"new"` means create.
  const [editing, setEditing] = useState<PetDTO | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PetDTO | null>(null);

  const petsQuery = useQuery(trpc.pet.list.queryOptions(MY_PETS_LIST_INPUT));
  const quotaQuery = useQuery(trpc.pet.quota.queryOptions());

  const deletePet = useMutation(
    trpc.pet.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Pet removido.");
        setPendingDelete(null);
        await queryClient.invalidateQueries({ queryKey: trpc.pet.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const quota = quotaQuery.data;
  const atLimit = quota?.remaining === 0;
  const pets = petsQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Gerencie todos os seus companheiros</p>
        <Button onClick={() => setEditing("new")} disabled={atLimit}>
          <Plus size={16} />
          Adicionar
        </Button>
      </div>

      {/* The plan gate the prototype rendered as static copy ("você pode
          cadastrar até 1 pet") while accepting unlimited pets. These numbers
          come from the server, which also enforces them. */}
      {quota ? (
        <Card className="border-secondary/40 bg-gradient-to-r from-warning/10 to-secondary/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <Crown className="size-6 shrink-0 text-secondary" />
              <div>
                <p className="font-medium">
                  {quota.tier === "PREMIUM" ? "Plano Premium" : "Plano Gratuito"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {quota.limit === null
                    ? `${quota.used} pets cadastrados — sem limite`
                    : `${quota.used} de ${quota.limit} pets cadastrados`}
                </p>
              </div>
            </div>
            {quota.tier === "FREE" ? (
              <Button variant="secondary" size="sm">
                Upgrade para Premium
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {petsQuery.isPending ? (
        <ListSkeleton count={3} withMedia />
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <PawPrint className="size-10 text-muted-foreground" />
            <p className="font-medium">Você ainda não cadastrou nenhum pet</p>
            <p className="text-sm text-muted-foreground">
              Cadastre seu primeiro companheiro para agendar serviços.
            </p>
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} />
              Adicionar pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pets.map((pet) => {
            const health = HEALTH_BADGE[pet.healthStatus];

            return (
              <Card key={pet.id} className="bg-gradient-card shadow-brand-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      {SPECIES_EMOJI[pet.species]} {pet.name}
                    </CardTitle>
                    <Badge variant={health.variant}>{health.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pet.breed ?? "SRD"} · {formatAgePtBR(pet.birthDate)}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <dl className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                    <dt>Espécie</dt>
                    <dd className="text-right font-medium text-foreground">
                      {SPECIES_LABELS[pet.species]}
                    </dd>
                    {pet.weightKg ? (
                      <>
                        <dt>Peso</dt>
                        <dd className="text-right font-medium text-foreground">
                          {pet.weightKg} kg
                        </dd>
                      </>
                    ) : null}
                    <dt>Castrado</dt>
                    <dd className="text-right font-medium text-foreground">
                      {pet.neutered ? "Sim" : "Não"}
                    </dd>
                  </dl>

                  {pet.notes ? (
                    <p className="rounded-lg bg-muted p-3 text-sm">{pet.notes}</p>
                  ) : null}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(pet)}>
                      <Pencil size={14} />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setPendingDelete(pet)}
                    >
                      <Trash2 size={14} />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PetForm
        pet={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O histórico de saúde e vacinas também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) deletePet.mutate({ id: pendingDelete.id });
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
