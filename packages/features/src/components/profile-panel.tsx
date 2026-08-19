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
  Skeleton,
  initials,
  toast,
} from "@animalesko/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAuthClient } from "../lib/auth-context.tsx";
import { useTRPC } from "../trpc.ts";

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
  const queryClient = useQueryClient();
  const { signOut } = useAuthClient();
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const profile = useQuery(trpc.profile.me.queryOptions());
  const me = profile.data?.profile;

  /*
   * Only the header block waits for `profile.me`.
   *
   * It used to early-return the entire tab, which meant `GamificationProfile`
   * was not mounted yet and so its request could not even be issued until this
   * one had come back: two round trips end to end, and three skeleton phases in
   * a row on a single screen. Everything that needs no profile — the menu, the
   * settings dialog, the points card — renders on the first pass instead, and
   * the two queries run side by side.
   */
  return (
    <div className="space-y-6">
      {profile.isPending ? (
        <ProfileHeaderSkeleton />
      ) : profile.data ? (
        <div className="border-b border-border pb-6 text-center">
          <Avatar className="mx-auto mb-3 size-20">
            <AvatarImage src={profile.data.profile.image ?? undefined} alt="" />
            <AvatarFallback className="bg-gradient-primary text-2xl font-bold text-gradient-foreground">
              {initials(profile.data.profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-semibold">{profile.data.profile.name}</h2>
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

          <p className="text-muted-foreground">{profile.data.profile.email}</p>
          {profile.data.profile.bio ? (
            <p className="mt-2 text-sm text-muted-foreground">{profile.data.profile.bio}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Pets" value={profile.data.counts.pets} />
            <Stat label="Serviços" value={profile.data.counts.bookings} />
            <Stat label="Avaliações" value={profile.data.counts.reviews} />
          </div>
        </div>
      ) : (
        // A failed request used to render the whole Perfil tab as nothing, with
        // no way back short of restarting the app.
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar seu perfil.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            loading={profile.isFetching}
            onClick={() => void profile.refetch()}
          >
            Tentar novamente
          </Button>
        </Card>
      )}

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
          // `signOut()` is a round trip, and a Sair that shows nothing while it
          // runs gets pressed a second time — which then races the cache clear
          // and the redirect below.
          loading={signingOut}
          onClick={async () => {
            setSigningOut(true);

            try {
              await signOut();
            } catch {
              setSigningOut(false);
              toast.error("Não foi possível sair. Tente novamente.");
              return;
            }

            // The browser query client lives for the whole tab, so without this
            // the previous user's favourites, notifications and profile stay in
            // memory — and any still-mounted protected query (every pet card
            // holds `favorite.ids`) refetches against the cleared cookie and
            // comes back UNAUTHORIZED.
            queryClient.clear();
            router.refresh();
            router.push("/");
          }}
        >
          <LogOut size={18} />
          Sair
        </Button>
      </div>

      {me ? <ProfileForm profile={me} open={editOpen} onOpenChange={setEditOpen} /> : null}

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

/**
 * Avatar, name, email and the three counters — and nothing below them.
 *
 * `ProfileSkeleton` from the library covers the points card too, which now has
 * a placeholder of its own that is loading at the same time; showing both would
 * put two stand-ins over one piece of content. The measurements mirror the
 * block above so the header does not shift by a line when the name arrives.
 */
function ProfileHeaderSkeleton() {
  return (
    <div className="border-b border-border pb-6 text-center">
      <Skeleton className="mx-auto mb-3 size-20 rounded-full" />
      <Skeleton className="mx-auto h-8 w-40" />
      <Skeleton className="mx-auto mt-1 h-5 w-52" />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="p-3">
            <Skeleton className="mx-auto my-0.5 h-6 w-10" />
            <Skeleton className="mx-auto my-0.5 h-3 w-14" />
          </Card>
        ))}
      </div>
    </div>
  );
}
