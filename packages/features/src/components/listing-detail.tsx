"use client";

import { formatAgePtBR } from "@animalesko/api/schemas";
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
  Separator,
  Textarea,
  cn,
  toast,
} from "@animalesko/ui";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "./page-header.tsx";
import { PetCard } from "./pet-card.tsx";
import { PLACEHOLDER_PET_IMAGE, SEX_LABELS, SIZE_LABELS, SPECIES_LABELS } from "../lib/display.ts";
import { getPlatform } from "../lib/platform.ts";
import { useSession } from "../lib/session-context.tsx";
import { useFavorites } from "../lib/use-favorites.ts";
import { useTRPC } from "../trpc.ts";

import type { ListingDetailDTO, PublicListingDTO } from "@animalesko/api";

const URGENCY = {
  URGENT: { label: "Urgente", variant: "destructive" as const, icon: AlertCircle },
  PUPPY: { label: "Filhote", variant: "secondary" as const, icon: CheckCircle2 },
  READY: { label: "Pronto para adoção", variant: "success" as const, icon: CheckCircle2 },
};

interface ListingDetailProps {
  listing: ListingDetailDTO;
  siblings: PublicListingDTO[];
}

export function ListingDetail({ listing, siblings }: ListingDetailProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const favorites = useFavorites();
  const { signedIn } = useSession();
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [sharing, setSharing] = useState(false);

  const href = getPlatform().listingHref(listing.id);
  const isFavorited = favorites.isListingFavorited(listing.id);
  const urgency = URGENCY[listing.urgency];
  const photos =
    listing.photos.length > 0
      ? listing.photos.map((photo) => photo.url)
      : [listing.pet.photoUrl ?? PLACEHOLDER_PET_IMAGE];

  const openConversation = useMutation(trpc.message.open.mutationOptions());
  const sendMessage = useMutation(trpc.message.send.mutationOptions());

  /**
   * Pending for the whole "contact the shelter" sequence, not per mutation.
   *
   * `openConversation.isPending || sendMessage.isPending` goes false in the gap
   * between the two round trips and again while the router navigates, so the
   * button flickered out of its pending state twice in the middle of an
   * operation that had not finished.
   */
  const [contacting, setContacting] = useState(false);

  /**
   * Opens the thread with the shelter, optionally posting a first message.
   *
   * `message.open` is idempotent per (org, listing, caller), so "Falar" and
   * "Quero adotar" land in the same conversation rather than starting a second
   * one — which is why the applicant's text can just be its first message.
   */
  async function contactShelter(firstMessage?: string) {
    if (!signedIn) {
      router.push(`/entrar?next=${encodeURIComponent(href)}`);
      return;
    }

    setContacting(true);
    try {
      const { conversationId } = await openConversation.mutateAsync({
        orgId: listing.org.id,
        listingId: listing.id,
      });

      if (firstMessage?.trim()) {
        await sendMessage.mutateAsync({ conversationId, body: firstMessage.trim() });
      }

      // Closed here rather than on the tap. Closing first unmounted the very
      // button `loading={contacting}` is bound to, so the applicant was dropped
      // back onto the detail page with no indication that two mutations and a
      // navigation were still running. Failing now also keeps the dialog — and
      // the text they typed — instead of discarding both.
      setApplyOpen(false);

      // Deliberately not cleared on success: the pending state has to survive
      // until the messages screen replaces this one.
      router.push(`/mensagens?conversa=${conversationId}`);
    } catch (error) {
      setContacting(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa.");
    }
  }

  async function share() {
    // Via the platform adapter so the native build gets the OS share sheet and
    // a URL pointing at the website rather than at capacitor://localhost. The
    // path is the site's `/pet/{id}`, not `href` — `href` is the route this
    // host navigates to internally, and the native one does not exist on the web.
    const platform = getPlatform();
    const url = platform.publicUrl(`/pet/${listing.id}`);

    setSharing(true);
    try {
      if (
        await platform.share({
          title: `Conheça ${listing.pet.name}!`,
          text: `🐾 ${listing.summary}\n\nDisponível para adoção na Animalesko 💚`,
          url,
        })
      ) {
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Link copiado! 📋");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <PageHeader
        title={listing.pet.name}
        subtitle={listing.org.name}
        backTo="/adocao"
        actions={
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Compartilhar"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              loading={sharing}
              onClick={share}
            >
              {sharing ? null : <Share2 size={18} />}
            </Button>
            {/* Indeterminate until `favoritesResolved`: an unfilled heart is an
                answer, and answering "not favourited" before the ids land means
                announcing the wrong state and then correcting it. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                favorites.favoritesResolved
                  ? isFavorited
                    ? "Remover dos favoritos"
                    : "Adicionar aos favoritos"
                  : "Favoritar"
              }
              aria-pressed={favorites.favoritesResolved ? isFavorited : undefined}
              className={cn(
                "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                !favorites.favoritesResolved && "opacity-50",
              )}
              onClick={() => favorites.toggleListing(listing.id, href)}
            >
              <Heart size={18} className={cn(isFavorited && "fill-current")} />
            </Button>
          </div>
        }
      />

      <main className="mx-auto max-w-md space-y-6 pb-10">
        <div className="relative aspect-4/3 w-full overflow-hidden">
          <Image
            src={photos[photoIndex] ?? PLACEHOLDER_PET_IMAGE}
            alt={listing.pet.name}
            fill
            priority
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
          />

          {photos.length > 1 ? (
            <>
              {/* The tap zones are invisible by design, which left an uncached
                  photo swapping with no sign the tap registered — so they wash
                  while pressed. */}
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() =>
                  setPhotoIndex((index) => (index - 1 + photos.length) % photos.length)
                }
                className="absolute inset-y-0 left-0 z-0 w-1/3 press-feedback active:bg-black/10"
              />
              <button
                type="button"
                aria-label="Próxima foto"
                onClick={() => setPhotoIndex((index) => (index + 1) % photos.length)}
                className="absolute inset-y-0 right-0 z-0 w-1/3 press-feedback active:bg-black/10"
              />

              <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
                {photos.map((photo, index) => (
                  <button
                    key={photo}
                    type="button"
                    aria-label={`Foto ${index + 1}`}
                    aria-current={index === photoIndex}
                    onClick={() => setPhotoIndex(index)}
                    className="relative flex size-11 items-center justify-center rounded-full press-feedback active:bg-primary-foreground/20"
                  >
                    {/* No transition on the dot: it is the answer to the tap,
                        and a 150ms fade is most of the press. */}
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        index === photoIndex ? "bg-primary-foreground" : "bg-primary-foreground/40",
                      )}
                    />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-6 px-4">
          <section>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-foreground">{listing.pet.name}</h2>
                <p className="text-muted-foreground">
                  {listing.pet.breed ?? "SRD"} · {formatAgePtBR(listing.pet.birthDate)}
                </p>
              </div>
              <Badge variant={urgency.variant} className="shrink-0">
                {urgency.label}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} />
              <span>
                {listing.city}, {listing.state}
              </span>
            </div>
          </section>

          <Card>
            <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm">
              <Fact label="Espécie" value={SPECIES_LABELS[listing.pet.species]} />
              <Fact label="Sexo" value={SEX_LABELS[listing.pet.sex]} />
              {listing.pet.size ? (
                <Fact label="Porte" value={SIZE_LABELS[listing.pet.size]} />
              ) : null}
              {listing.pet.weightKg ? (
                <Fact label="Peso" value={`${listing.pet.weightKg} kg`} />
              ) : null}
              <Fact label="Castrado" value={listing.pet.neutered ? "Sim" : "Não"} />
            </CardContent>
          </Card>

          {listing.pet.temperament.length > 0 ? (
            <section>
              <h3 className="mb-3 font-semibold">Temperamento</h3>
              <div className="flex flex-wrap gap-2">
                {listing.pet.temperament.map((trait) => (
                  <Badge key={trait} variant="secondary">
                    {trait}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-3 font-semibold">Sobre {listing.pet.name}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{listing.summary}</p>
            {listing.story ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{listing.story}</p>
            ) : null}
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 font-semibold">Responsável</h3>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate font-medium">
                    {listing.org.name}
                    {listing.org.verificationStatus === "APPROVED" ? (
                      <BadgeCheck size={16} className="shrink-0 text-primary" />
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[listing.org.city, listing.org.state].filter(Boolean).join(", ") ||
                      "Localização não informada"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={contacting}
                  onClick={() => void contactShelter()}
                >
                  <MessageCircle size={16} />
                  Falar
                </Button>
              </CardContent>
            </Card>
          </section>

          {listing.status === "AVAILABLE" ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() =>
                signedIn
                  ? setApplyOpen(true)
                  : router.push(`/entrar?next=${encodeURIComponent(href)}`)
              }
            >
              <Heart size={18} />
              Quero adotar {listing.pet.name}
            </Button>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                {listing.status === "ADOPTED"
                  ? `${listing.pet.name} já encontrou uma família! 💚`
                  : `${listing.pet.name} está reservado no momento.`}
              </CardContent>
            </Card>
          )}

          {siblings.length > 0 ? (
            <section>
              <h3 className="mb-4 text-lg font-semibold">Outros pets do {listing.org.name}</h3>
              <div className="space-y-4">
                {siblings.map((sibling) => (
                  <PetCard key={sibling.id} listing={sibling} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      {/*
       * The adoption application. `AdoptionApplication` exists in the schema
       * with a questionnaire column, but no procedure accepts one yet, so this
       * opens a conversation with the shelter carrying the applicant's message
       * — which is what the prototype's dialog pretended to do with a toast.
       */}
      <Dialog
        open={applyOpen}
        // Escape and the overlay are dismissals too, and dismissing mid-send
        // would hide the pending state the same way closing on tap did.
        // `contactShelter` closes it directly, so this never blocks success.
        onOpenChange={(next) => {
          if (!contacting) setApplyOpen(next);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adotar {listing.pet.name}</DialogTitle>
            <DialogDescription>
              Conte um pouco sobre você e sua casa. O {listing.org.name} responde por aqui mesmo.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={5}
            placeholder="Moro em apartamento com varanda telada, tenho experiência com cães de porte médio…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" disabled={contacting} onClick={() => setApplyOpen(false)}>
              Cancelar
            </Button>
            <Button loading={contacting} onClick={() => void contactShelter(message)}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
