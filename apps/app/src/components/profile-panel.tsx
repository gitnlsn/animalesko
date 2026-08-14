"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  initials,
} from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  Edit,
  Heart,
  HelpCircle,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GamificationProfile } from "./gamification-profile.tsx";
import { ProfileForm } from "./profile-form.tsx";
import { ThemeToggle } from "./theme-toggle.tsx";
import { signOut } from "~/lib/auth-client.ts";
import { useTRPC } from "~/trpc/react.tsx";

/** The prototype's profile menu, plus the pages it never linked to. */
const LINKS = [
  { href: "/favoritos", label: "Meus favoritos", icon: Heart },
  { href: "/historico", label: "Histórico de serviços", icon: Calendar },
  { href: "/meus-pets", label: "Meus pets", icon: Users },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/avaliacoes", label: "Avaliações", icon: Star },
  { href: "/verificacao", label: "Verificação de conta", icon: ShieldCheck },
  { href: "/suporte", label: "Ajuda & suporte", icon: HelpCircle },
] as const;

export function ProfilePanel() {
  const trpc = useTRPC();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const profile = useQuery(trpc.profile.me.queryOptions());

  if (profile.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!profile.data) return null;

  const { profile: me, counts } = profile.data;

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6 text-center">
        <Avatar className="mx-auto mb-3 size-20">
          <AvatarImage src={me.image ?? undefined} alt="" />
          <AvatarFallback className="bg-gradient-primary text-2xl font-bold text-primary-foreground">
            {initials(me.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center justify-center gap-2">
          <h2 className="text-xl font-semibold">{me.name}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Editar perfil"
            onClick={() => setEditOpen(true)}
          >
            <Edit size={16} className="text-primary" />
          </Button>
        </div>

        <p className="text-muted-foreground">{me.email}</p>
        {me.bio ? <p className="mt-2 text-sm text-muted-foreground">{me.bio}</p> : null}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Pets" value={counts.pets} />
          <Stat label="Serviços" value={counts.bookings} />
          <Stat label="Avaliações" value={counts.reviews} />
        </div>
      </div>

      <GamificationProfile />

      <div className="space-y-3">
        {LINKS.map((link) => {
          const Icon = link.icon;

          return (
            <Button key={link.href} asChild variant="outline" className="w-full justify-start">
              <Link href={link.href}>
                <Icon size={18} />
                {link.label}
              </Link>
            </Button>
          );
        })}

        <Button asChild variant="destructive" className="w-full justify-start">
          <Link href="/pet-alert">
            <AlertCircle size={18} />
            🚨 Pet Alert
          </Link>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={18} />
          Configurações
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive"
          onClick={async () => {
            await signOut();
            router.refresh();
            router.push("/");
          }}
        >
          <LogOut size={18} />
          Sair
        </Button>
      </div>

      <ProfileForm profile={me} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Configurações</DialogTitle>
            <DialogDescription>Personalize sua experiência no Animalesko</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-foreground">Modo escuro</h3>
                <p className="text-sm text-muted-foreground">Alternar entre tema claro e escuro</p>
              </div>
              <ThemeToggle />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="mb-2 font-medium text-foreground">Sobre o app</h3>
              <p className="text-sm text-muted-foreground">
                Animalesko — todo animal merece um humano de estimação 🐾
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Versão 1.0.0</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <div className="text-xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
