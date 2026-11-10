"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SidebarContent, Wordmark } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Tenancy } from "@/lib/authz/can";

// The 48px bar under 1024px (DESIGN_BRIEF 5.3): a menu button that opens the
// sidebar as a drawer from the start edge, and the wordmark.

export function TopBar({ tenancy }: { tenancy: Tenancy }) {
  const t = useTranslations("shell");
  const [open, setOpen] = useState(false);
  return (
    <header className="flex h-topbar shrink-0 items-center gap-2 px-2 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("openMenu")}>
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-sidebar gap-0 bg-frame p-0"
        >
          <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("closeMenu")}
              className="absolute end-2 top-2"
            >
              <X aria-hidden="true" />
            </Button>
          </SheetClose>
          <SidebarContent
            tenancy={tenancy}
            onNavigate={() => {
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
      <Wordmark />
    </header>
  );
}
