"use client";

import {
  formatBRL,
  formatPaymentMethod,
  formatPaymentStatus,
  paymentMethodSchema,
  type PaymentMethod,
} from "@animalesko/api/schemas";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  cn,
  toast,
} from "@animalesko/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CreditCard, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { formatDateTimePtBR } from "~/lib/display.ts";
import { useTRPC } from "~/trpc/react.tsx";

const METHOD_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  PIX: QrCode,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  CASH: Banknote,
};

const METHOD_HINTS: Record<PaymentMethod, string> = {
  PIX: "Confirmação imediata",
  CREDIT_CARD: "Em até 12x (em breve)",
  DEBIT_CARD: "Débito à vista",
  CASH: "Você paga ao prestador no dia",
};

/**
 * Paying for a booking.
 *
 * The prototype's version was a `setTimeout` and a toast. This writes a real
 * `Payment` row and confirms the booking, but there is still no gateway behind
 * it — see `payment.use-cases.ts`. Card fields are deliberately absent: taking
 * a PAN into this form would be a compliance problem, and a real integration
 * would redirect or embed the provider's own iframe.
 */
export function PaymentView() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("agendamento");

  const [method, setMethod] = useState<PaymentMethod>("PIX");

  const booking = useQuery({
    ...trpc.booking.byId.queryOptions({ id: bookingId ?? "" }),
    enabled: Boolean(bookingId),
  });

  const pay = useMutation(
    trpc.payment.pay.mutationOptions({
      onSuccess: async (payment) => {
        toast.success(
          payment.status === "PAID" ? "Pagamento confirmado! ✅" : "Pagamento registrado",
          {
            description:
              payment.status === "PAID"
                ? `${formatBRL(payment.amountCents)} — ${payment.booking.offering.title}.`
                : "Combine o pagamento diretamente com o prestador.",
          },
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.booking.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.payment.pathKey() }),
        ]);
        router.push("/historico");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!bookingId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <CreditCard className="size-10 text-muted-foreground" />
          <p className="font-medium">Nenhum agendamento selecionado</p>
          <p className="text-sm text-muted-foreground">
            Abra o pagamento a partir de um agendamento no seu histórico.
          </p>
          <Button asChild className="mt-2">
            <Link href="/historico">Ver histórico</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (booking.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (booking.isError || !booking.data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Agendamento não encontrado.
        </CardContent>
      </Card>
    );
  }

  const data = booking.data;
  const alreadyPaid = data.payment?.status === "PAID";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{data.offering.title}</CardTitle>
          <CardDescription>
            {data.org.name} · {data.pet.name}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <Row label="Quando" value={formatDateTimePtBR(data.startsAt)} />
          <Row label="Código" value={data.code} mono />
          {data.payment ? (
            <Row label="Status" value={formatPaymentStatus(data.payment.status)} />
          ) : null}

          <Separator className="my-3" />

          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-bold text-primary">{formatBRL(data.priceCents)}</span>
          </div>
        </CardContent>
      </Card>

      {alreadyPaid ? (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="size-6 shrink-0 text-success" />
            <div>
              <p className="font-medium">Este agendamento já foi pago</p>
              <p className="text-sm text-muted-foreground">
                Pago via {formatPaymentMethod(data.payment!.method)}.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Forma de pagamento</h2>

            <RadioGroup
              value={method}
              onValueChange={(value) => setMethod(value as PaymentMethod)}
              className="gap-3"
            >
              {paymentMethodSchema.options.map((option) => {
                const Icon = METHOD_ICONS[option];

                return (
                  <Label
                    key={option}
                    htmlFor={`method-${option}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                      method === option ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value={option} id={`method-${option}`} />
                    <Icon size={20} className="shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-medium">{formatPaymentMethod(option)}</p>
                      <p className="text-xs text-muted-foreground">{METHOD_HINTS[option]}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </section>

          <Button
            className="w-full"
            size="lg"
            loading={pay.isPending}
            onClick={() => pay.mutate({ bookingId, method })}
          >
            Pagar {formatBRL(data.priceCents)}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Ambiente de demonstração — nenhuma cobrança real é feita.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("truncate font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
