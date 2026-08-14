"use client";

import {
  LISTING_TRANSITIONS,
  formatAdoptionStatus,
  formatAdoptionUrgency,
  formatAgePtBR,
  formatApplicationStatus,
  type AdoptionStatus,
  type AdoptionUrgency,
  type ApplicationStatus,
} from "@animalesko/api/schemas";
import {
  Avatar,
  AvatarFallback,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
  initials,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Heart, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LISTING_STATUS_VARIANT } from "./listings-panel.tsx";
import { formatDatePtBR, PLACEHOLDER_PET_IMAGE, SPECIES_EMOJI } from "~/lib/display.ts";
import { useCanAdminister } from "~/lib/org-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

import type { ApplicationDTO, ProviderListingDTO } from "@animalesko/api";

const APPLICATION_VARIANT: Record<
  ApplicationStatus,
  "success" | "warning" | "default" | "destructive" | "muted"
> = {
  SUBMITTED: "warning",
  IN_REVIEW: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  WITHDRAWN: "muted",
};

export function ListingDetail({ listing }: { listing: ProviderListingDTO }) {
  const trpc = useTRPC();
  const canAdminister = useCanAdminister();
  const [adoptOpen, setAdoptOpen] = useState(false);

  const applications = useQuery(trpc.listing.applications.queryOptions({ listingId: listing.id }));

  const status = listing.status as AdoptionStatus;
  const items = applications.data ?? [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/adocao">
          <ArrowLeft size={16} />
          Todos os anúncios
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-4/3">
            <Image
              src={listing.photos[0]?.url ?? listing.pet.photoUrl ?? PLACEHOLDER_PET_IMAGE}
              alt={listing.pet.name}
              fill
              sizes="(max-width: 1024px) 100vw, 400px"
              className="object-cover"
            />
          </div>

          {listing.photos.length > 1 ? (
            <div className="flex gap-2 p-3">
              {listing.photos.slice(1).map((photo) => (
                <div key={photo.id} className="relative size-16 shrink-0">
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="rounded-md object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-primary">
                  {SPECIES_EMOJI[listing.pet.species]} {listing.pet.name}
                </h1>
                <p className="text-muted-foreground">
                  {listing.pet.breed ?? "SRD"} · {formatAgePtBR(listing.pet.birthDate)}
                </p>
              </div>

              <Badge variant={LISTING_STATUS_VARIANT[status]}>{formatAdoptionStatus(status)}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {listing.city}, {listing.state}
              </span>
              <Badge variant="outline">
                {formatAdoptionUrgency(listing.urgency as AdoptionUrgency)}
              </Badge>
              <span className="flex items-center gap-1">
                <Heart size={14} />
                {listing._count.favorites}
              </span>
            </div>
          </div>

          <p className="text-sm">{listing.summary}</p>
          {listing.story ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{listing.story}</p>
          ) : null}

          <Separator />

          <StatusControls
            listing={listing}
            applications={items}
            canAdminister={canAdminister}
            onAdopt={() => setAdoptOpen(true)}
          />

          {status === "AVAILABLE" ? (
            <Button asChild variant="outline" size="sm">
              <a href={`${appUrl}/pet/${listing.id}`} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                Ver como o tutor vê
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Candidaturas {items.length > 0 ? `(${items.length})` : ""}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {applications.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {status === "AVAILABLE"
                ? "Nenhuma candidatura ainda."
                : "Publique o anúncio para começar a receber candidaturas."}
            </p>
          ) : (
            items.map((application) => (
              <ApplicationRow key={application.id} application={application} />
            ))
          )}
        </CardContent>
      </Card>

      <AdoptionDialog
        listing={listing}
        applications={items}
        open={adoptOpen}
        onOpenChange={setAdoptOpen}
      />
    </div>
  );
}

function StatusControls({
  listing,
  applications,
  canAdminister,
  onAdopt,
}: {
  listing: ProviderListingDTO;
  applications: ApplicationDTO[];
  canAdminister: boolean;
  onAdopt: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const setStatus = useMutation(
    trpc.listing.setStatus.mutationOptions({
      onSuccess: async (updated) => {
        toast.success(
          `Anúncio agora está ${formatAdoptionStatus(updated.status as AdoptionStatus).toLowerCase()}.`,
        );
        await queryClient.invalidateQueries({ queryKey: trpc.listing.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const status = listing.status as AdoptionStatus;
  const next = LISTING_TRANSITIONS[status];

  if (!canAdminister) {
    return (
      <p className="text-sm text-muted-foreground">
        Só administradores da organização podem publicar ou concluir uma adoção.
      </p>
    );
  }

  if (next.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {listing.adoptedAt
          ? `Adotado em ${formatDatePtBR(listing.adoptedAt)}. 💚`
          : "Este anúncio está encerrado."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((target) => {
        // ADOPTED needs to name the adopter, so it opens the dialog instead of
        // firing the mutation — the animal changes hands here.
        if (target === "ADOPTED") {
          return (
            <Button
              key={target}
              size="sm"
              variant="success"
              disabled={applications.length === 0}
              title={
                applications.length === 0 ? "Ninguém se candidatou a este animal ainda." : undefined
              }
              onClick={onAdopt}
            >
              Marcar como adotado
            </Button>
          );
        }

        return (
          <Button
            key={target}
            size="sm"
            variant={target === "ARCHIVED" ? "ghost" : "outline"}
            loading={setStatus.isPending}
            className={cn(target === "ARCHIVED" && "text-destructive")}
            onClick={() => setStatus.mutate({ id: listing.id, status: target })}
          >
            {target === "AVAILABLE" && status === "DRAFT"
              ? "Publicar no Animalesko"
              : formatAdoptionStatus(target)}
          </Button>
        );
      })}
    </div>
  );
}

function ApplicationRow({ application }: { application: ApplicationDTO }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const decide = useMutation(
    trpc.listing.decide.mutationOptions({
      onSuccess: async () => {
        toast.success("Candidatura atualizada — o candidato foi avisado.");
        await queryClient.invalidateQueries({ queryKey: trpc.listing.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const status = application.status as ApplicationStatus;
  const decided = status === "APPROVED" || status === "REJECTED" || status === "WITHDRAWN";

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback>{initials(application.applicant.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{application.applicant.name}</p>
            <Badge variant={APPLICATION_VARIANT[status]}>{formatApplicationStatus(status)}</Badge>
          </div>

          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail size={12} />
              {application.applicant.email}
            </span>
            {application.applicant.phone ? (
              <span className="flex items-center gap-1">
                <Phone size={12} />
                {application.applicant.phone}
              </span>
            ) : null}
            {application.applicant.city ? (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {application.applicant.city}, {application.applicant.state}
              </span>
            ) : null}
          </div>

          {application.message ? (
            <p className="mt-2 rounded-lg bg-muted p-2 text-sm">{application.message}</p>
          ) : null}

          <p className="mt-1 text-xs text-muted-foreground">
            Recebida em {formatDatePtBR(application.createdAt)}
          </p>
        </div>
      </div>

      {!decided ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "SUBMITTED" ? (
            <Button
              size="sm"
              variant="outline"
              loading={decide.isPending}
              onClick={() => decide.mutate({ applicationId: application.id, status: "IN_REVIEW" })}
            >
              Em análise
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="success"
            loading={decide.isPending}
            onClick={() => decide.mutate({ applicationId: application.id, status: "APPROVED" })}
          >
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            loading={decide.isPending}
            onClick={() => decide.mutate({ applicationId: application.id, status: "REJECTED" })}
          >
            Recusar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Concluding the adoption.
 *
 * Deliberately a second step after approving: a shelter approves a candidate
 * before the home visit, and only hands the animal over afterwards. This is the
 * moment ownership actually transfers.
 */
function AdoptionDialog({
  listing,
  applications,
  open,
  onOpenChange,
}: {
  listing: ProviderListingDTO;
  applications: ApplicationDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [applicationId, setApplicationId] = useState("");

  const candidates = applications.filter(
    (application) => application.status !== "WITHDRAWN" && application.status !== "REJECTED",
  );

  const setStatus = useMutation(
    trpc.listing.setStatus.mutationOptions({
      onSuccess: async () => {
        toast.success(`${listing.pet.name} foi adotado! 🎉`, {
          description: "O animal passou para o novo tutor e o anúncio saiu do ar.",
        });
        onOpenChange(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.listing.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.animal.pathKey() }),
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
          <DialogTitle>Concluir adoção de {listing.pet.name}</DialogTitle>
          <DialogDescription>
            O animal passa para o tutor escolhido e sai da sua guarda. As outras candidaturas são
            recusadas e todos são avisados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Select value={applicationId} onValueChange={setApplicationId}>
            <SelectTrigger aria-label="Escolher o adotante">
              <SelectValue placeholder="Quem vai adotar?" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((application) => (
                <SelectItem key={application.id} value={application.id}>
                  {application.applicant.name}
                  {application.status === "APPROVED" ? " (aprovada)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            disabled={!applicationId}
            loading={setStatus.isPending}
            onClick={() =>
              setStatus.mutate({
                id: listing.id,
                status: "ADOPTED",
                adopterApplicationId: applicationId,
              })
            }
          >
            Confirmar adoção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
