"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanTenantSlug } from "@/lib/tenant-slug";
import { cn } from "@/lib/utils";

// "Continue with Google" (FE-3, TRD 5.5, DESIGN_BRIEF 7.1). A plain link to
// the BFF's start route, which sends the browser to identity; no script
// runs the flow. In multi mode the user names the workspace first, because
// identity cannot ask for it inside the Google round trip (TRD decision 11).

export const GOOGLE_START_PATH = "/api/auth/google/start";

export function googleStartUrl(next: string, tenant?: string): string {
  const params = new URLSearchParams();
  if (next !== "/") {
    params.set("next", next);
  }
  if (tenant) {
    params.set("tenant", tenant);
  }
  const query = params.toString();
  return query ? `${GOOGLE_START_PATH}?${query}` : GOOGLE_START_PATH;
}

function GoogleMark() {
  // A static brand asset; Google's colours stay out of the design tokens.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/icons/google.svg" alt="" className="size-4" />;
}

export function GoogleButton({
  next,
  multi,
  initialTenant,
}: {
  next: string;
  /** Multi-tenant mode: ask for the workspace slug first. */
  multi: boolean;
  initialTenant?: string | undefined;
}) {
  const t = useTranslations("auth.google");
  const inputId = useId();
  const helpId = useId();
  const [tenant, setTenant] = useState(initialTenant ?? "");
  const slug = cleanTenantSlug(tenant);
  const className = cn(
    buttonVariants({ variant: "outline", size: "lg" }),
    "w-full",
  );

  if (!multi) {
    return (
      <a href={googleStartUrl(next)} className={className}>
        <GoogleMark />
        {t("continue")}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{t("tenant")}</Label>
        <Input
          id={inputId}
          value={tenant}
          autoComplete="organization"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={helpId}
          onChange={(event) => {
            setTenant(event.target.value);
          }}
        />
        <p id={helpId} className="text-small text-muted-foreground">
          {t("tenantHelp")}
        </p>
      </div>
      {slug ? (
        <a href={googleStartUrl(next, slug)} className={className}>
          <GoogleMark />
          {t("continue")}
        </a>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled
          aria-describedby={helpId}
          className="w-full"
        >
          <GoogleMark />
          {t("continue")}
        </Button>
      )}
    </div>
  );
}
