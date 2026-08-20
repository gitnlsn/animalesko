"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
} from "@animalesko/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { signIn, signUp } from "~/lib/auth-client.ts";

// One schema for both modes. Swapping the resolver on a mode toggle changes
// the form's value type mid-render, which react-hook-form cannot type; `name`
// is optional here and required only when signing up, checked below.
const credentialsSchema = z.object({
  name: z.string().trim().optional(),
  email: z.email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState(false);

  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: CredentialsValues) {
    if (mode === "signup" && !values.name) {
      form.setError("name", { message: "Nome é obrigatório" });
      return;
    }

    setPending(true);

    try {
      const result =
        mode === "signin"
          ? await signIn.email({ email: values.email, password: values.password })
          : await signUp.email({
              name: values.name ?? "",
              email: values.email,
              password: values.password,
            });

      if (result.error) {
        toast.error(result.error.message ?? "Não foi possível entrar.");
        return;
      }

      // refresh() re-runs the server component that reads the session, so the
      // new cookie is picked up before navigating.
      router.refresh();
      router.push(next);
    } catch {
      // A rejection, not a `result.error`: the client only returns one once it
      // has a response, so anything that stops the request reaching the server
      // throws out of here instead. Left uncaught it skipped the reset below,
      // and the button spun forever without ever saying what went wrong.
      toast.error("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "signin" ? "Entrar" : "Criar conta"}</CardTitle>
        <CardDescription>
          {mode === "signin" ? "Acesse sua conta Animalesko." : "Leva menos de um minuto."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {mode === "signup" ? (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" loading={pending}>
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                form.clearErrors();
              }}
            >
              {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
