"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/sign-out";

/** A button that signs out of this device and goes to sign-in (APP_FLOW 5.9). */
export function SignOutButton({
  children,
  variant = "link",
  className,
}: {
  children: React.ReactNode;
  variant?: "link" | "outline" | "ghost";
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
      onClick={() => {
        setPending(true);
        void signOut();
      }}
    >
      {children}
    </Button>
  );
}
