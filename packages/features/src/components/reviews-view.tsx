"use client";

import { createReviewSchema, type CreateReviewInput } from "@animalesko/api/schemas";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ListSkeleton,
  Textarea,
  cn,
  initials,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { formatDatePtBR } from "../lib/display.ts";
import { useTRPC } from "../trpc.ts";

/** A 1–5 star input. Radio group semantics, so it is keyboard-operable. */
function StarRating({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const readOnly = !onChange;

  return (
    <div className="flex gap-1" role={readOnly ? "img" : "radiogroup"} aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const icon = (
          <Star
            size={size}
            className={cn(filled ? "fill-secondary text-secondary" : "text-muted-foreground/40")}
          />
        );

        if (readOnly) return <span key={star}>{icon}</span>;

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange(star)}
            // `hover:scale-110` is inert on a touch screen and the 300ms
            // `transition-smooth` it rode on animated nothing a finger could
            // see. The press is what needs answering, and `press-feedback`
            // lands it on the frame of the tap. The fill is already instant —
            // it comes from `value`, not from a transition.
            className="press-feedback hover:scale-110 active:scale-125"
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Reviews the tutor has written, plus the completed services still awaiting
 * one.
 *
 * A review is anchored to a booking, so this screen can only offer what the
 * tutor actually received — the prototype let anyone write a review about
 * anything, into component state.
 */
export function ReviewsView() {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("agendamento");

  const pending = useQuery(trpc.review.pending.queryOptions());
  const mine = useQuery(trpc.review.mine.queryOptions());

  if (pending.isPending || mine.isPending) {
    return <ListSkeleton count={4} />;
  }

  const awaiting = pending.data ?? [];
  const written = mine.data ?? [];

  return (
    <div className="space-y-8">
      {awaiting.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Aguardando sua avaliação</h2>
          <div className="space-y-3">
            {awaiting.map((booking) => (
              <ReviewForm
                key={booking.id}
                bookingId={booking.id}
                title={booking.offeringTitle}
                orgName={booking.orgName}
                petName={booking.petName}
                defaultOpen={booking.id === preselected}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Suas avaliações</h2>

        {written.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Star className="size-10 text-muted-foreground" />
              <p className="font-medium">Você ainda não avaliou ninguém</p>
              <p className="text-sm text-muted-foreground">
                Depois de um serviço realizado, ele aparece aqui para você avaliar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {written.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={review.author.image ?? undefined} alt="" />
                      <AvatarFallback>{initials(review.author.name)}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{review.org.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {review.booking?.offering.title} · {formatDatePtBR(review.createdAt)}
                      </p>
                    </div>

                    <StarRating value={review.rating} size={14} />
                  </div>

                  {review.comment ? <p className="text-sm">{review.comment}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewForm({
  bookingId,
  title,
  orgName,
  petName,
  defaultOpen,
}: {
  bookingId: string;
  title: string;
  orgName: string;
  petName: string;
  defaultOpen: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const createReview = useMutation(
    trpc.review.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Avaliação enviada! ⭐", { description: "+20 Pontos Aumigos." });
        setOpen(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.review.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.booking.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.gamification.pathKey() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {orgName} · para {petName}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {open ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();

              // Same schema the server parses, so a zero-star submit is caught
              // here with the server's own message.
              const parsed = createReviewSchema.safeParse({
                bookingId,
                rating,
                comment: comment.trim() || null,
              } satisfies Partial<CreateReviewInput>);

              if (!parsed.success) {
                toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
                return;
              }

              createReview.mutate(parsed.data);
            }}
          >
            <StarRating value={rating} onChange={setRating} />

            <Textarea
              rows={3}
              placeholder="Como foi o atendimento?"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" loading={createReview.isPending}>
                Enviar avaliação
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Star size={14} />
            Avaliar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
