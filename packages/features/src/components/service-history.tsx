"use client";

import {
  formatBookingStatus,
  formatBRL,
  formatPaymentStatus,
  CANCELLABLE_STATUSES,
  type BookingStatus,
} from "@animalesko/api/schemas";
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
  ListSkeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CreditCard, Loader2, MapPin, Star, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatDateTimePtBR, formatMonthPtBR } from "../lib/display.ts";
import { HISTORY_BOOKINGS_LIMIT } from "../lib/query-inputs.ts";
import { useTRPC } from "../trpc.ts";

import type { BookingDTO } from "@animalesko/api";
import type { ComponentProps } from "react";

const STATUS_VARIANT: Record<
  BookingStatus,
  "success" | "default" | "warning" | "muted" | "destructive"
> = {
  COMPLETED: "success",
  CONFIRMED: "default",
  IN_PROGRESS: "default",
  PENDING: "warning",
  CANCELLED: "destructive",
  NO_SHOW: "muted",
};

/** The prototype's four tabs, now real status filters. */
const TABS = [
  { value: "all", label: "Todos", status: undefined },
  { value: "completed", label: "Realizados", status: "COMPLETED" as const },
  { value: "pending", label: "Pendentes", status: "PENDING" as const },
  { value: "cancelled", label: "Cancelados", status: "CANCELLED" as const },
];

export function ServiceHistory() {
  const [pendingCancel, setPendingCancel] = useState<BookingDTO | null>(null);

  return (
    <>
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* `forceMount` because Radix unmounts the inactive tabs, which took
            each list's query down with them — so the first tap on every tab
            replaced the list with a full-height skeleton for a round trip. The
            hidden lists mount once, alongside "Todos", and every switch after
            that is instant. */}
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} forceMount>
            <BookingList status={tab.status} onCancel={setPendingCancel} />
          </TabsContent>
        ))}
      </Tabs>

      <CancelDialog booking={pendingCancel} onClose={() => setPendingCancel(null)} />
    </>
  );
}

function BookingList({
  status,
  onCancel,
}: {
  status?: BookingStatus;
  onCancel: (booking: BookingDTO) => void;
}) {
  const trpc = useTRPC();
  const bookings = useQuery(
    trpc.booking.list.queryOptions({ status, limit: HISTORY_BOOKINGS_LIMIT }),
  );

  if (bookings.isPending) {
    return <ListSkeleton count={4} />;
  }

  const items = bookings.data ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <Calendar className="size-10 text-muted-foreground" />
          <p className="font-medium">Nenhum serviço por aqui</p>
          <p className="text-sm text-muted-foreground">
            Seus agendamentos aparecem nesta lista assim que você marcar o primeiro.
          </p>
          <NavButton href="/servicos" className="mt-2">
            Ver serviços
          </NavButton>
        </CardContent>
      </Card>
    );
  }

  // The prototype grouped by a hardcoded month string. `booking.list` already
  // returns newest-first, so a single pass preserves that order per group.
  const groups = new Map<string, BookingDTO[]>();

  for (const booking of items) {
    const key = formatMonthPtBR(booking.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), booking]);
  }

  return (
    <div className="space-y-6">
      {[...groups].map(([month, bookings]) => (
        <section key={month}>
          <h2 className="mb-3 text-lg font-semibold text-foreground capitalize">{month}</h2>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onCancel={onCancel} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
}: {
  booking: BookingDTO;
  onCancel: (booking: BookingDTO) => void;
}) {
  const cancellable = CANCELLABLE_STATUSES.includes(booking.status as BookingStatus);
  const needsPayment = !booking.payment || booking.payment.status === "PENDING";
  const reviewable = booking.status === "COMPLETED" && booking.review === null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{booking.offering.title}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {booking.org.name} · {booking.pet.name}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[booking.status as BookingStatus]} className="shrink-0">
            {formatBookingStatus(booking.status as BookingStatus)}
          </Badge>
        </div>

        <dl className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="shrink-0" />
            <span>{formatDateTimePtBR(booking.startsAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0" />
            <span className="font-mono text-xs">{booking.code}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="shrink-0" />
            <span>
              {formatBRL(booking.priceCents)}
              {booking.payment
                ? ` · ${formatPaymentStatus(booking.payment.status)}`
                : " · não pago"}
            </span>
          </div>
        </dl>

        {booking.notes ? <p className="rounded-lg bg-muted p-3 text-sm">{booking.notes}</p> : null}

        {booking.cancellationReason ? (
          <p className="text-sm text-muted-foreground">
            Motivo do cancelamento: {booking.cancellationReason}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {needsPayment && booking.status !== "CANCELLED" ? (
            <NavButton href={`/pagamento?agendamento=${booking.id}`} size="sm">
              <CreditCard size={14} />
              Pagar
            </NavButton>
          ) : null}

          {reviewable ? (
            <NavButton href={`/avaliacoes?agendamento=${booking.id}`} size="sm" variant="outline">
              <Star size={14} />
              Avaliar
            </NavButton>
          ) : null}

          {booking.review ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star size={14} className="fill-secondary text-secondary" />
              Você avaliou com {booking.review.rating}
            </span>
          ) : null}

          {cancellable ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onCancel(booking)}
            >
              <X size={14} />
              Cancelar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * A link that admits it was tapped.
 *
 * `Button` presses instantly, but every destination here is another route with
 * its own query behind it, so the press lands and then nothing moves for as
 * long as that takes. `loading` dims the control and marks it busy for that
 * gap, and incidentally stops a second tap pushing the same route twice. The
 * flag never needs clearing: the transition unmounts this card.
 */
function NavButton({
  href,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "asChild" | "loading"> & { href: string }) {
  const [navigating, setNavigating] = useState(false);

  return (
    <Button asChild loading={navigating} {...props}>
      <Link href={href} onClick={() => setNavigating(true)}>
        {children}
      </Link>
    </Button>
  );
}

function CancelDialog({ booking, onClose }: { booking: BookingDTO | null; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const cancelBooking = useMutation(
    trpc.booking.cancel.mutationOptions({
      onSuccess: async () => {
        toast.success("Agendamento cancelado.");
        onClose();
        await queryClient.invalidateQueries({ queryKey: trpc.booking.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog open={booking !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar {booking?.offering.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            O prestador será avisado e o horário volta a ficar livre na agenda dele.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter agendamento</AlertDialogCancel>
          {/* `preventDefault` holds the dialog open until the server answers,
              which without a pending state left a live "Cancelar" under the
              finger: a second tap fired a second cancellation. */}
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 active:bg-destructive/80"
            disabled={cancelBooking.isPending}
            aria-busy={cancelBooking.isPending || undefined}
            onClick={(event) => {
              event.preventDefault();
              if (booking) cancelBooking.mutate({ id: booking.id });
            }}
          >
            {cancelBooking.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {cancelBooking.isPending ? "Cancelando…" : "Cancelar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
