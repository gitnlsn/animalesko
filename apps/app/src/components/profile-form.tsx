"use client";

import {
  updateProfileSchema,
  type UpdateProfileFormValues,
  type UpdateProfileInput,
} from "@animalesko/api/schemas";
import {
  Button,
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
  Textarea,
  toast,
} from "@animalesko/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { useTRPC } from "~/trpc/react.tsx";

import type { ProfileDTO } from "@animalesko/api";

interface ProfileFormProps {
  profile: ProfileDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edit profile.
 *
 * Validated by the same schema the mutation parses, replacing the prototype's
 * three hand-written regex checks that ran only in the browser. E-mail is not
 * editable here: it is the sign-in credential, so changing it needs a
 * verification round-trip rather than a text input next to "Cidade".
 */
export function ProfileForm({ profile, open, onOpenChange }: ProfileFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<UpdateProfileFormValues, unknown, UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      street: profile.street ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      postalCode: profile.postalCode ?? "",
    },
  });

  const updateProfile = useMutation(
    trpc.profile.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Perfil atualizado! 🐾", { description: "Suas informações foram salvas." });
        onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: trpc.profile.pathKey() });
      },
      onError: (error) => {
        const fieldErrors = error.data?.zodError?.fieldErrors;

        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            const message = messages?.[0];
            if (message) form.setError(field as keyof UpdateProfileFormValues, { message });
          }
          return;
        }

        toast.error(error.message);
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">Editar perfil</DialogTitle>
          <DialogDescription>Atualize suas informações pessoais</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => updateProfile.mutate(values))}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input value={profile.email} disabled readOnly />
              </FormControl>
              <FormDescription>
                O e-mail é usado para entrar e não pode ser alterado por aqui.
              </FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(XX) XXXXX-XXXX"
                      autoComplete="tel"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
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

            <div className="grid grid-cols-3 gap-3">
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
            </div>

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

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição / Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Conte um pouco sobre você e seus pets…"
                      {...field}
                      value={field.value ?? ""}
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
              <Button type="submit" loading={updateProfile.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
