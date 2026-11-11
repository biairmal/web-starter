"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormErrorSummary } from "@/components/forms/form-field";
import { bffPost } from "@/lib/api/bff-fetch";
import type { LoginResult } from "@/lib/api/bff-types";
import { useErrorText } from "@/lib/api/use-error-text";
import { hardNavigate } from "@/lib/hard-navigate";
import { AuthHeading } from "@/features/auth/auth-screen";
import {
  type PendingSignIn,
  clearPendingSignIn,
  getPendingSignIn,
  recallSignIn,
} from "@/features/auth/pending-sign-in";

// The tenant picker (FE-8, APP_FLOW 5.2, DESIGN_BRIEF 7.1): one row per
// tenant; picking one signs in again with its slug. The password comes from
// memory; after a reload it is gone, and the user goes back to sign-in.

export const SIGN_IN_PATH = "/sign-in";

export function TenantPicker() {
  const t = useTranslations("auth.tenantPicker");
  const router = useRouter();
  const errorText = useErrorText();
  const [pending] = useState<PendingSignIn | null>(getPendingSignIn);
  const [chosen, setChosen] = useState<string | null>(null);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!pending) {
      const next = recallSignIn()?.next;
      router.replace(
        next && next !== "/"
          ? `${SIGN_IN_PATH}?${new URLSearchParams({ next }).toString()}`
          : SIGN_IN_PATH,
      );
    }
  }, [pending, router]);

  if (!pending) {
    return null;
  }

  const choose = async (slug: string) => {
    setChosen(slug);
    setMessage(undefined);
    try {
      const result = await bffPost<LoginResult>("/api/auth/login", {
        email: pending.email,
        password: pending.password,
        tenant: slug,
        next: pending.next,
      });
      if ("tenant_required" in result) {
        throw new Error("identity asked for a tenant again");
      }
      clearPendingSignIn();
      hardNavigate(result.next);
    } catch (error) {
      setChosen(null);
      setMessage(errorText(error).text);
    }
  };

  return (
    <div className="flex flex-col">
      <AuthHeading title={t("title")} body={t("body")} />
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {pending.tenants.map((tenant) => (
          <li key={tenant.id}>
            <button
              type="button"
              disabled={chosen !== null}
              aria-busy={chosen === tenant.slug || undefined}
              onClick={() => {
                void choose(tenant.slug);
              }}
              className="flex h-14 w-full items-center gap-3 px-2 text-start hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {tenant.name}
                </span>
                <span className="truncate text-small text-muted-foreground">
                  {tenant.slug}
                </span>
              </span>
              {chosen === tenant.slug ? (
                <Loader2
                  aria-hidden="true"
                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                />
              ) : (
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
      <FormErrorSummary invalidCount={0} message={message} className="mt-4" />
      <p className="mt-6 text-body">
        <Link
          href={SIGN_IN_PATH}
          onClick={() => {
            clearPendingSignIn();
          }}
          className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
