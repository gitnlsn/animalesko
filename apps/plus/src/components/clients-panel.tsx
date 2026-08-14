"use client";

import {
  createClientContactSchema,
  type CreateClientContactFormValues,
  type CreateClientContactInput,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  toast,
} from "@animalesko/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Pencil, Phone, Plus, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useTRPC } from "~/trpc/react.tsx";

import type { ClientContactDTO } from "@animalesko/api";

/**
 * Walk-in clients.
 *
 * The prototype had no such screen — `clientName` and `phone` were free-text
 * fields on each appointment, so there was nothing to list and no way to see
 * that the same person had been in three times.
 */
export function ClientsPanel() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<ClientContactDTO | "new" | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const clients = useQuery(
    trpc.clientContact.list.queryOptions({ q: debounced || undefined, limit: 200 }),
  );

  const items = clients.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Clientes</h1>
          <p className="text-muted-foreground">Quem agenda com você sem ter conta no Animalesko</p>
        </div>

        <Button onClick={() => setEditing("new")}>
          <Plus size={16} />
          Novo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          size={16}
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Nome ou telefone…"
          aria-label="Buscar clientes"
          className="pl-10"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {clients.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="size-10 text-muted-foreground" />
            <p className="font-medium">
              {debounced ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
            <p className="text-sm text-muted-foreground">
              Clientes são criados automaticamente quando você registra um agendamento presencial.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((client) => (
            <Card key={client.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold">{client.name}</h2>
                    {client.user ? (
                      <Badge variant="secondary" className="text-xs">
                        Tem conta
                      </Badge>
                    ) : null}
                  </div>

                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone size={12} />
                    <a href={`tel:${client.phone}`} className="underline">
                      {client.phone}
                    </a>
                  </p>

                  {client.email ? (
                    <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <Mail size={12} />
                      {client.email}
                    </p>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    {client._count.appointments}{" "}
                    {client._count.appointments === 1 ? "atendimento" : "atendimentos"}
                  </p>

                  {client.notes ? (
                    <p className="rounded-lg bg-muted p-2 text-xs">{client.notes}</p>
                  ) : null}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${client.name}`}
                  onClick={() => setEditing(client)}
                >
                  <Pencil size={14} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientForm
        client={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}

function ClientForm({
  client,
  open,
  onOpenChange,
}: {
  client: ClientContactDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEditing = Boolean(client);

  const form = useForm<CreateClientContactFormValues, unknown, CreateClientContactInput>({
    resolver: zodResolver(createClientContactSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "" },
  });

  // The dialog stays mounted between openings, so `defaultValues` alone would
  // keep showing whichever client was edited first.
  useEffect(() => {
    if (!open) return;

    form.reset({
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      notes: client?.notes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  const onSettled = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.clientContact.pathKey() });
  };

  const create = useMutation(
    trpc.clientContact.create.mutationOptions({
      onSuccess: () => {
        toast.success("Cliente cadastrado.");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
      onSettled,
    }),
  );

  const update = useMutation(
    trpc.clientContact.update.mutationOptions({
      onSuccess: () => {
        toast.success("Cliente atualizado.");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
      onSettled,
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar ${client?.name}` : "Novo cliente"}</DialogTitle>
          <DialogDescription>Os campos marcados com * são obrigatórios.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              client ? update.mutate({ id: client.id, ...values }) : create.mutate(values),
            )}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value ?? ""} />
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
              <Button type="submit" loading={create.isPending || update.isPending}>
                {isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
