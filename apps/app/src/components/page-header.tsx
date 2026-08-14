"use client";

import { Button } from "@animalesko/ui";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Where the back arrow goes. Omit to step back in history, which is what the
   * prototype's `navigate(-1)` did — but pass an explicit route for any page
   * that can be reached by a shared link, or the arrow strands a first-time
   * visitor with nothing to go back to.
   */
  backTo?: string;
  actions?: React.ReactNode;
}

/** The gradient bar with a back arrow that every secondary page opens with. */
export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-brand-md">
      <div className="mx-auto flex max-w-md items-center gap-3 p-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Voltar"
          className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={() => (backTo ? router.push(backTo) : router.back())}
        >
          <ArrowLeft size={20} />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-primary-foreground/80">{subtitle}</p>
          ) : null}
        </div>

        {actions}
      </div>
    </header>
  );
}
