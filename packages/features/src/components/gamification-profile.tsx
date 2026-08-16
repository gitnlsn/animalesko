"use client";

import { POINTS } from "@animalesko/api/schemas";
import { Badge, Card, Progress, cn } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { Award, Trophy } from "lucide-react";

import { useTRPC } from "../trpc.ts";

/**
 * "Pontos Aumigos".
 *
 * Read-only, and there is no `addPoints` anywhere on the client: points are
 * awarded server-side by the action that earns them. The prototype exposed
 * `addPoints(n, reason)` to every component and stored the total in
 * `localStorage`, so the score was both unauditable and free to mint.
 *
 * Every badge is listed, earned or not, so the card shows what is still to
 * play for — the prototype rendered only unlocked ones and hid the rest.
 */
export function GamificationProfile() {
  const trpc = useTRPC();
  const profile = useQuery(trpc.gamification.profile.queryOptions({ limit: 5 }));

  if (profile.isPending) {
    return <Card className="p-4 text-sm text-muted-foreground">Carregando…</Card>;
  }

  if (!profile.data) return null;

  const { points, level, nextLevel, progress, badges } = profile.data;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card p-4 shadow-brand-md">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary" size={20} />
            <h3 className="font-semibold text-foreground">Nível atual</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl">{level.icon}</div>
            <Badge variant="secondary" className="text-xs">
              Nível {level.level}
            </Badge>
          </div>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">{level.name}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{points} Pontos Aumigos</span>
            {nextLevel ? <span>{nextLevel.minPoints} pts</span> : <span>Nível máximo</span>}
          </div>
          <Progress value={progress} />
          {nextLevel ? (
            <p className="text-center text-xs text-muted-foreground">
              Próximo: {nextLevel.name} {nextLevel.icon}
            </p>
          ) : null}
        </div>
      </Card>

      {badges.length > 0 ? (
        <Card className="bg-gradient-card p-4 shadow-brand-md">
          <div className="mb-3 flex items-center gap-2">
            <Award className="text-accent" size={20} />
            <h3 className="font-semibold text-foreground">Badges</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.code}
                className={cn(
                  "flex items-center gap-2 rounded-lg p-2 transition-smooth",
                  badge.earned ? "bg-muted/50 hover:bg-muted" : "opacity-50 grayscale",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {badge.icon}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{badge.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="bg-muted/30 p-4">
        <h4 className="mb-2 text-sm font-semibold text-foreground">Como ganhar pontos:</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>🐕 Enviar pedido de adoção: +{POINTS.ADOPTION_APPLICATION} pts</li>
          <li>⭐ Avaliar prestador: +{POINTS.REVIEW_CREATED} pts</li>
          <li>💚 Favoritar pet: +{POINTS.FAVORITE_ADDED} pts</li>
          <li>🚨 Ajudar no Pet Alert: +{POINTS.ALERT_SIGHTING} pts</li>
        </ul>
      </Card>
    </div>
  );
}
