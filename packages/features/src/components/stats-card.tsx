import { Card } from "@animalesko/ui";

import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
}

/**
 * The prototype's version also took a `trend` prop and rendered "+12%" beside
 * the value. Nothing records a previous period, so the arrow was decoration
 * with a number attached; it is gone rather than faked.
 *
 * Nothing here is tappable, so there is no `hover:shadow` either: a card that
 * lifts under the cursor reads as a link, and on a phone — where the lift never
 * happens — the only thing left of that promise is a tap that does nothing.
 */
export function StatsCard({ title, value, subtitle, icon: Icon }: StatsCardProps) {
  return (
    <Card className="bg-gradient-card p-4 shadow-brand-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="shrink-0 rounded-lg bg-primary-light p-3">
          <Icon size={24} className="text-primary" />
        </div>
      </div>
    </Card>
  );
}
