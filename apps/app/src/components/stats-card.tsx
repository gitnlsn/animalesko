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
 */
export function StatsCard({ title, value, subtitle, icon: Icon }: StatsCardProps) {
  return (
    <Card className="bg-gradient-card p-4 shadow-brand-md transition-smooth hover:shadow-brand-lg">
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
