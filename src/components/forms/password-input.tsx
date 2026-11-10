"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A password input with a show/hide toggle. Takes every `<input>` prop. */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("forms.password");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        spellCheck={false}
        className={cn("pe-10", className)}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={t("show")}
        aria-controls={props.id}
        onClick={() => {
          setVisible((value) => !value);
        }}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}
