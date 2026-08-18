"use client";

import {
  formatOrganizationType,
  formatVerificationStatus,
  organizationTypeSchema,
  submitVerificationSchema,
  updateOrganizationSchema,
  type OrganizationType,
  type SubmitVerificationFormValues,
  type SubmitVerificationInput,
  type UpdateOrganizationFormValues,
  type UpdateOrganizationInput,
  type VerificationStatus,
} from "@animalesko/api/schemas";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DetailSkeleton,
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
import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import { useForm } from "react-hook-form";

import { ImageUpload } from "./image-upload.tsx";
import { formatDatePtBR } from "~/lib/display.ts";
import { useCanAdminister } from "~/lib/org-context.tsx";
import { useTRPC } from "~/trpc/react.tsx";

import type { OrganizationDTO } from "@animalesko/api";

const VERIFICATION_VARIANT: Record<
  VerificationStatus,
  "success" | "warning" | "destructive" | "muted"
> = {
  NOT_SUBMITTED: "muted",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

/**
 * The organization's own record.
 *
 * The prototype's "profile" tab edited a *person* — name, e-mail, phone —
 * with three hardcoded stat cards beside it. What a provider panel administers
 * is the business, which is also what carries the badge consumers see.
 */
export function OrganizationPanel() {
  const trpc = useTRPC();
  const organization = useQuery(trpc.organization.current.queryOptions());

  if (organization.isPending) {
    return <DetailSkeleton />;
  }

  if (!organization.data) return null;

  const org = organization.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{org.name}</h1>
        <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
          {formatOrganizationType(org.type as OrganizationType)}
          {org.ratingCount > 0 ? (
            <span className="flex items-center gap-1 text-sm">
              <Star size={14} className="fill-secondary text-secondary" />
              {org.ratingAvg.toFixed(1)} ({org.ratingCount})
            </span>
          ) : (
            <span className="text-sm">Ainda sem avaliações</span>
          )}
        </p>
      </div>

      <ProfileForm organization={org} />
      <Verification />
    </div>
  );
}

function ProfileForm({ organization }: { organization: OrganizationDTO }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canAdminister = useCanAdminister();

  const form = useForm<UpdateOrganizationFormValues, unknown, UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      type: organization.type as OrganizationType,
      description: organization.description ?? "",
      phone: organization.phone ?? "",
      email: organization.email ?? "",
      addressLine: organization.addressLine ?? "",
      city: organization.city ?? "",
      state: organization.state ?? "",
      postalCode: organization.postalCode ?? "",
      avatarUrl: organization.avatarUrl ?? "",
    },
  });

  const update = useMutation(
    trpc.organization.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Dados atualizados.");
        await queryClient.invalidateQueries({ queryKey: trpc.organization.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dados da organização</CardTitle>
        <CardDescription>
          {canAdminister
            ? "É o que os tutores veem no Animalesko."
            : "Somente administradores podem alterar estes dados."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => update.mutate(values))}
          >
            <fieldset disabled={!canAdminister} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizationTypeSchema.options.map((option: OrganizationType) => (
                            <SelectItem key={option} value={option}>
                              {formatOrganizationType(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Só abrigos publicam animais para adoção.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} value={field.value ?? ""} />
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

              <FormField
                control={form.control}
                name="addressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
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
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={2}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        label="Logo"
                        value={field.value || null}
                        onChange={(url) => field.onChange(url ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {canAdminister ? (
              <Button type="submit" loading={update.isPending}>
                Salvar
              </Button>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * Verification.
 *
 * Deferred from the consumer app pass, which explains at `/verificacao` that
 * the flow belongs here: `ProviderVerification.orgId` is unique, so what gets
 * verified is a business, not a person.
 */
function Verification() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const canAdminister = useCanAdminister();

  const verification = useQuery(trpc.organization.verification.queryOptions());

  const form = useForm<SubmitVerificationFormValues, unknown, SubmitVerificationInput>({
    resolver: zodResolver(submitVerificationSchema),
    defaultValues: {
      documentUrl: "",
      addressProofUrl: "",
      certificatesUrl: "",
      experienceDescription: "",
    },
  });

  const submit = useMutation(
    trpc.organization.submitVerification.mutationOptions({
      onSuccess: async () => {
        toast.success("Documentos enviados para análise.");
        await queryClient.invalidateQueries({ queryKey: trpc.organization.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const current = verification.data;
  const status = (current?.status ?? "NOT_SUBMITTED") as VerificationStatus;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck size={18} className="text-primary" />
              Verificação
            </CardTitle>
            <CardDescription>O selo azul ao lado do seu nome no Animalesko.</CardDescription>
          </div>
          <Badge variant={VERIFICATION_VARIANT[status]}>{formatVerificationStatus(status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === "APPROVED" ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 p-4">
            <BadgeCheck className="size-6 shrink-0 text-success" />
            <div>
              <p className="font-medium">Organização verificada</p>
              {current?.reviewedAt ? (
                <p className="text-sm text-muted-foreground">
                  Aprovada em {formatDatePtBR(current.reviewedAt)}.
                </p>
              ) : null}
            </div>
          </div>
        ) : status === "PENDING" ? (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
            <p className="font-medium">Documentos em análise</p>
            <p className="text-muted-foreground">
              Enviados em {current ? formatDatePtBR(current.submittedAt) : "—"}. Avisamos assim que
              houver uma resposta.
            </p>
          </div>
        ) : (
          <>
            {status === "REJECTED" && current?.rejectionReason ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="font-medium">Documentação recusada</p>
                <p className="text-muted-foreground">{current.rejectionReason}</p>
              </div>
            ) : null}

            {canAdminister ? (
              <Form {...form}>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit((values) => submit.mutate(values))}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="documentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload
                              label="Documento de identidade *"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              value={field.value || null}
                              onChange={(url) => field.onChange(url ?? "")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="addressProofUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload
                              label="Comprovante de endereço *"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              value={field.value || null}
                              onChange={(url) => field.onChange(url ?? "")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="certificatesUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload
                              label="Certificados"
                              description="CRMV, alvará ou registro da ONG."
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              value={field.value || null}
                              onChange={(url) => field.onChange(url ?? "")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experienceYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anos de experiência</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
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
                  </div>

                  <FormField
                    control={form.control}
                    name="experienceDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobre sua atuação</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" loading={submit.isPending}>
                    Enviar para análise
                  </Button>
                </form>
              </Form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Somente administradores podem enviar a documentação.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
