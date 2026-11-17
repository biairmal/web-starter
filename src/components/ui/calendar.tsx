"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { DayPicker } from "react-day-picker";
import { enUS, id } from "react-day-picker/locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A month grid (react-day-picker) in the app's locale: arrow keys move by
// day, Page Up/Down by month, Home/End to the week's ends. Selection modes are
// DayPicker's own (single, range, multiple); the date pickers wrap it.

const LOCALES = { en: enUS, id } as const;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const locale = useLocale();
  return (
    <DayPicker
      locale={locale === "id" ? LOCALES.id : LOCALES.en}
      showOutsideDays={showOutsideDays}
      className={cn("w-fit p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-stack-md md:flex-row",
        month: "flex w-full flex-col gap-stack-sm",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "aria-disabled:opacity-50",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "aria-disabled:opacity-50",
        ),
        month_caption: "flex h-button-sm items-center justify-center px-8",
        caption_label: "text-body font-medium",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday:
          "size-8 text-center text-meta font-normal text-muted-foreground select-none",
        week: "mt-1 flex",
        day: "group/day relative size-8 p-0 text-center select-none",
        range_start: "rdp-range-start rounded-s-md bg-muted",
        range_middle: "rdp-range-middle bg-muted",
        range_end: "rdp-range-end rounded-e-md bg-muted",
        day_button:
          "inline-flex size-8 items-center justify-center rounded-md text-body tabular-nums outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[outside=true]/day:text-muted-foreground group-data-[today=true]/day:font-semibold group-data-[today=true]/day:text-brand-accent group-data-[disabled=true]/day:pointer-events-none group-data-[disabled=true]/day:opacity-40 group-data-[selected=true]/day:bg-primary group-data-[selected=true]/day:text-primary-foreground group-[.rdp-range-middle]/day:bg-transparent group-[.rdp-range-middle]/day:text-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          ) : (
            <ChevronRight
              aria-hidden="true"
              className="size-4 rtl:rotate-180"
            />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
