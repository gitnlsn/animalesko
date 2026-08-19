"use client";

import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { buttonVariants } from "./button.tsx";
import { cn } from "../lib/cn.ts";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Re-exported so consumers need not depend on react-day-picker directly. */
export type { DateRange } from "react-day-picker";

/**
 * Date picker, pt-BR by default.
 *
 * Written against react-day-picker 10, whose class-name keys differ from the
 * v8 the prototypes used (`day_selected` → `selected`, `head_cell` →
 * `weekday`, `nav_button_previous` → `button_previous`, and days are now a
 * `day` cell wrapping a `day_button`). Restyling this from a v8 example will
 * silently produce an unstyled calendar, since unknown keys are ignored.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const dayCell = cn(
    buttonVariants({ variant: "ghost" }),
    "size-9 p-0 font-normal aria-selected:opacity-100",
  );

  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-medium capitalize",
        nav: "flex items-center justify-between absolute inset-x-3 top-3",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-7 disabled:opacity-40",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-7 disabled:opacity-40",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-xs font-normal text-muted-foreground capitalize",
        week: "mt-1 flex w-full",
        day: cn(
          "relative p-0 text-center text-sm",
          // Range mode paints the cell, so the middle days need square corners
          // and the ends a rounded outer edge.
          "[&:has([aria-selected])]:bg-primary-light first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        ),
        day_button: dayCell,
        // The hover overrides exist to stop the ghost day button repainting a
        // painted cell; `active:` needs the same treatment, or pressing a
        // selected day turns it muted grey on the way to reselecting it.
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          "active:bg-primary active:text-primary-foreground",
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:active:bg-primary",
        ),
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: cn(
          "bg-primary-light [&>button]:bg-transparent [&>button]:text-foreground",
          "[&>button]:hover:bg-primary/20 [&>button]:active:bg-primary/20",
        ),
        today: "font-semibold text-primary",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40 line-through",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...chevronProps} />
          ) : (
            <ChevronRight className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
