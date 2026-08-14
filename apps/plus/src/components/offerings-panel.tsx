"use client";

import { formatPrice, priceUnitSchema } from "@animalesko/api/schemas";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTRPC } from "~/trpc/react.tsx";

import type { OfferingDTO } from "@animalesko/api";

const SERVICE_LABELS = {
  PET_SITTER: "Pet Sitter",
  DOG_WALKER: "Dog Walker",
  DAYCARE: "Creche",
  HOTEL: "Hotel",
  GROOMING: "Banho e Tosa",
  VET_CONSULT: "Consulta Veterinária",
  VACCINATION: "Vacinação",
  TRAINING: "Adestramento",
  TRANSPORT: "Transporte",
  OTHER: "Outro",
} as const;

const UNIT_LABELS = {
  PER_HOUR: "por hora",
  PER_DAY: "por dia",
  PER_NIGHT: "por noite",
  PER_WALK: "por passeio",
  PER_SESSION: "por sessão",
} as const;

/**
 * The form takes reais and converts to cents on submit — the API only ever
 * sees integer cents, so no float ever reaches the database.
 */
const offeringFormSchema = z.object({
  type: z.enum(Object.keys(SERVICE_LABELS) as [keyof typeof SERVICE_LABELS]),
  title: z.string().trim().min(1, "Título é obrigatório").max(80),
  description: z.string().trim().max(1000).optional(),
  priceReais: z.number().positive("Informe um valor maior que zero"),
  priceUnit: priceUnitSchema,
});

type OfferingFormValues = z.infer<typeof offeringFormSchema>;

export function OfferingsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // `null` closed, "new" creating, an offering editing.
  const [editing, setEditing] = useState<OfferingDTO | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OfferingDTO | null>(null);

  const open = editing !== null;
  const target = editing === "new" ? null : editing;

  const offerings = useQuery(trpc.offering.list.queryOptions());

  const form = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringFormSchema),
    defaultValues: {
      type: "PET_SITTER",
      title: "",
      description: "",
      priceReais: 0,
      priceUnit: "PER_DAY",
    },
  });

  // The dialog stays mounted between openings, so `defaultValues` alone would
  // keep showing whichever offering was edited first.
  useEffect(() => {
    if (!open) return;

    form.reset({
      type: (target?.type ?? "PET_SITTER") as OfferingFormValues["type"],
      title: target?.title ?? "",
      description: target?.description ?? "",
      // Cents in the database, reais in the form.
      priceReais: target ? target.priceCents / 100 : 0,
      priceUnit: target?.priceUnit ?? "PER_DAY",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.offering.pathKey() });
  };

  const createOffering = useMutation(
    trpc.offering.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Serviço publicado — já está visível para os tutores.");
        form.reset();
        setEditing(null);
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateOffering = useMutation(
    trpc.offering.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Serviço atualizado.");
        setEditing(null);
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteOffering = useMutation(
    trpc.offering.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Serviço removido.");
        setPendingDelete(null);
        await invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const toggleActive = useMutation(
    trpc.offering.update.mutationOptions({
      onSuccess: invalidate,
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Meus serviços</h2>
        <Button onClick={() => setEditing("new")}>
          <Plus />
          Novo serviço
        </Button>
      </div>

      {offerings.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : offerings.data?.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="font-medium">Você ainda não publicou nenhum serviço</p>
            <p className="text-sm text-muted-foreground">
              Publique um serviço para começar a receber agendamentos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {offerings.data?.map((offering) => (
            <Card key={offering.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{offering.title}</CardTitle>
                  <Badge variant={offering.isActive ? "success" : "muted"}>
                    {offering.isActive ? "Visível" : "Oculto"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {SERVICE_LABELS[offering.type]} ·{" "}
                  {formatPrice(offering.priceCents, offering.priceUnit)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {offering.description ? <p className="text-sm">{offering.description}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={toggleActive.isPending}
                    onClick={() =>
                      toggleActive.mutate({ id: offering.id, isActive: !offering.isActive })
                    }
                  >
                    {offering.isActive ? "Ocultar do app" : "Publicar no app"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(offering)}>
                    <Pencil size={14} />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setPendingDelete(offering)}
                  >
                    <Trash2 size={14} />
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target ? `Editar ${target.title}` : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              Serviços visíveis aparecem imediatamente para os tutores no Animalesko.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => {
                const payload = {
                  type: values.type,
                  title: values.title,
                  description: values.description ?? null,
                  // Reais in, cents stored — no float ever reaches the column.
                  priceCents: Math.round(values.priceReais * 100),
                  priceUnit: values.priceUnit,
                };

                if (target) {
                  updateOffering.mutate({ id: target.id, ...payload });
                  return;
                }

                createOffering.mutate({ ...payload, tags: [], isActive: true });
              })}
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de serviço</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SERVICE_LABELS).map(([value, label]) => (
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Passeio matinal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="priceReais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || ""}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Armazenado em centavos.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cobrado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(UNIT_LABELS).map(([value, label]) => (
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  loading={createOffering.isPending || updateOffering.isPending}
                >
                  {target ? "Salvar" : "Publicar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {pendingDelete?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              O serviço sai do Animalesko imediatamente. Agendamentos já feitos não são afetados —
              se a intenção é apenas parar de receber novos, prefira ocultá-lo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) deleteOffering.mutate({ id: pendingDelete.id });
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
