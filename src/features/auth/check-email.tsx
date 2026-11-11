"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthHeading } from "@/features/auth/auth-screen";
import { recallSignUpEmail } from "@/features/auth/check-email-store";
import { ResendButton } from "@/features/auth/resend-button";

// "Check your email" after sign-up (FE-4, DESIGN_BRIEF 7.2): the address is
// echoed so a typo is visible, with a resend that waits 60 seconds between
// sends. The same screen shows whether or not the address was new.

export function CheckEmail() {
  const t = useTranslations("auth.checkEmail");
  // Read after mount: the server has no access to this tab's storage.
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    setEmail(recallSignUpEmail());
  }, []);

  return (
    <div className="flex flex-col">
      <AuthHeading
        title={t("title")}
        body={
          email
            ? t.rich("bodyWithEmail", {
                email,
                strong: (chunks) => (
                  <strong className="font-medium text-foreground">
                    {chunks}
                  </strong>
                ),
              })
            : t("body")
        }
      />
      {email && <ResendButton email={email} coolingDown />}
      <p className="mt-6 text-body text-muted-foreground">
        {t("wrongAddress")}{" "}
        <Link
          href="/sign-up"
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("startAgain")}
        </Link>
      </p>
    </div>
  );
}
