"use client";

import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// The actions for one table row: the first `inline` as icon buttons, the
// rest in an overflow menu. Put it in a column marked `rowActions`.

export type RowAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function RowActions({
  name,
  actions,
  inline = 0,
}: {
  /** The row's name, for the menu button's label ("Actions for Ayu"). */
  name: string;
  actions: readonly RowAction[];
  /** How many actions show as icon buttons; each needs an icon. */
  inline?: number;
}) {
  const t = useTranslations("dataTable");
  const shown = actions.slice(0, inline).filter((action) => action.icon);
  const rest = actions.filter((action) => !shown.includes(action));
  const firstDestructive = rest.findIndex((action) => action.destructive);

  return (
    <div className="flex items-center justify-end gap-inline-xs">
      {shown.length > 0 && (
        <TooltipProvider>
          {shown.map((action) => {
            const Icon = action.icon ?? MoreHorizontal;
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={action.label}
                    disabled={action.disabled}
                    className={
                      action.destructive ? "text-destructive" : undefined
                    }
                    onClick={action.onSelect}
                  >
                    <Icon aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{action.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      )}
      {rest.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("rowActions", { name })}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {rest.map((action, index) => {
              const Icon = action.icon;
              return (
                <Fragment key={action.id}>
                  {/* A separator before the first destructive action. */}
                  {index === firstDestructive && index > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    variant={action.destructive ? "destructive" : "default"}
                    disabled={action.disabled}
                    onSelect={action.onSelect}
                  >
                    {Icon && <Icon aria-hidden="true" />}
                    {action.label}
                  </DropdownMenuItem>
                </Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
