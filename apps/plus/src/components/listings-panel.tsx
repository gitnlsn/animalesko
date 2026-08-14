"use client";

import {
  adoptionUrgencySchema,
  createListingSchema,
  formatAdoptionStatus,
  formatAdoptionUrgency,
  formatAgePtBR,
  type AdoptionStatus,
  type AdoptionUrgency,
  type CreateListingFormValues,
  type CreateListingInput,
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
import { HeartHandshake, Plus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ImageUploadList } from "./image-upload.tsx";
import { PLACEHOLDER_PET_IMAGE, SPECIES_EMOJI } from "~/lib/display.ts";
import { usePlus } from "~/lib/org-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

export const LISTING_STATUS_VARIANT: Record<
  AdoptionStatus,
  "success" | "warning" | "default" | "muted"
> = {
  DRAFT: "muted",
  AVAILABLE: "success",
  RESERVED: "warning",
  ADOPTED: "default",
  ARCHIVED: "muted",
};

/**
 * The shelter's adoption listings.
 *
 * Absent from the prototype, which is why the consumer app's adoption feed
 * could only ever be filled by `pnpm db:seed`. This is the supply side of
 * `catalog.listings`.
 */
export function ListingsPanel() {
  const trpc = useTRPC();
  const { org } = usePlus();
  const [creating, setCreating] = useState(false);

  const listings = useQuery(trpc.listing.list.queryOptions({ limit: 100 }));
  const applications = useQuery(trpc.listing.applications.queryOptions({}));

  const items = listings.data ?? [];
  const openApplications = (applications.data ?? []).filter(
    (application) => application.status === "SUBMITTED" || application.status === "IN_REVIEW",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Adoção</h1>
          <p className="text-muted-foreground">
            O que o {org.name} publica aqui aparece para os tutores no Animalesko
          </p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          Novo anúncio
        </Button>
      </div>

      {openApplications.length > 0 ? (
        <Card className="border-secondary/40 bg-secondary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Users className="size-6 shrink-0 text-secondary" />
              <div>
                <p className="font-medium">
                  {openApplications.length}{" "}
                  {openApplications.length === 1
                    ? "candidatura aguardando"
                    : "candidaturas aguardando"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Abra o anúncio para ver quem se candidatou.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {listings.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <HeartHandshake className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum anúncio ainda</p>
            <p className="text-sm text-muted-foreground">
              Registre um animal em{" "}
              <Link href="/animais" className="underline">
                Animais
              </Link>{" "}
              e publique-o para adoção.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((listing) => (
            <Card key={listing.id} className="overflow-hidden p-0">
              <Link href={`/adocao/${listing.id}`} className="block">
                <div className="relative aspect-4/3">
                  <Image
                    src={listing.photos[0]?.url ?? listing.pet.photoUrl ?? PLACEHOLDER_PET_IMAGE}
                    alt={listing.pet.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                  />
                  <Badge
                    variant={LISTING_STATUS_VARIANT[listing.status as AdoptionStatus]}
                    className="absolute top-3 right-3"
                  >
                    {formatAdoptionStatus(listing.status as AdoptionStatus)}
                  </Badge>
                </div>
              </Link>

              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/adocao/${listing.id}`} className="hover:underline">
                      <h2 className="truncate font-semibold">
                        {SPECIES_EMOJI[listing.pet.species]} {listing.pet.name}
                      </h2>
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {listing.pet.breed ?? "SRD"} · {formatAgePtBR(listing.pet.birthDate)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {formatAdoptionUrgency(listing.urgency as AdoptionUrgency)}
                  </Badge>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{listing.summary}</p>

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {listing._count.applications}{" "}
                    {listing._count.applications === 1 ? "candidatura" : "candidaturas"}
                  </span>
                  <span>
                    {listing._count.favorites}{" "}
                    {listing._count.favorites === 1 ? "favorito" : "favoritos"}
                  </span>
                </div>

                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/adocao/${listing.id}`}>Gerenciar</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListingForm open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function ListingForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Only animals in custody with no listing yet: `AdoptionListing.petId` is
  // unique, so offering the rest would just produce a CONFLICT.
  const animals = useQuery({
    ...trpc.animal.list.queryOptions({ relation: "CUSTODY" }),
    enabled: open,
  });
  const available = (animals.data ?? []).filter((animal) => !animal.listing);

  const form = useForm<CreateListingFormValues, unknown, CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      summary: "",
      story: "",
      urgency: "READY",
      city: "",
      state: "",
      photoUrls: [],
    },
  });

  const create = useMutation(
    trpc.listing.create.mutationOptions({
      onSuccess: async (listing) => {
        toast.success(`Anúncio de ${listing.pet.name} criado como rascunho.`, {
          description: "Publique quando estiver pronto para aparecer no Animalesko.",
        });
        form.reset();
        onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: trpc.listing.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo anúncio de adoção</DialogTitle>
          <DialogDescription>
            Começa como rascunho — nada aparece para os tutores até você publicar.
          </DialogDescription>
        </DialogHeader>

        {available.length === 0 ? (
          <div className="space-y-3 py-4 text-center">
            <HeartHandshake className="mx-auto size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum animal disponível para anunciar</p>
            <p className="text-sm text-muted-foreground">
              Todo animal sob sua guarda já tem anúncio, ou ainda não há nenhum registrado.
            </p>
            <Button asChild variant="outline">
              <Link href="/animais">Registrar animal</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => create.mutate(values))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animal *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {available.map((animal) => (
                            <SelectItem key={animal.id} value={animal.id}>
                              {SPECIES_EMOJI[animal.species]} {animal.name}
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
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {adoptionUrgencySchema.options.map((option: AdoptionUrgency) => (
                            <SelectItem key={option} value={option}>
                              {formatAdoptionUrgency(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Urgentes aparecem primeiro na busca.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade *</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF *</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={2}
                          placeholder="SP"
                          {...field}
                          onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resumo *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="A frase que aparece no card do anúncio."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="story"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>História</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Como chegou até vocês, temperamento, com quem se dá bem…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      É o que convence alguém a visitar. Vale escrever com calma.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photoUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUploadList
                        label="Fotos"
                        value={field.value ?? []}
                        onChange={field.onChange}
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
                  Criar rascunho
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
