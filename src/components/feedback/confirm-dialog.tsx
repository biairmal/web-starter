"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Confirmations (DESIGN_BRIEF 6.3): the title asks the question naming the
// object, the body says what happens and what does not, the button is the
// verb. Destructive actions use the negative colour; irreversible ones ask the
// user to type the object's name first. While the action runs the dialog stays
// open and shows a spinner in the confirm button.

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
  destructive = false,
  confirmText,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  /** The verb: "Remove from tenant", "Delete role". Never "OK". */
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
  /** When set, the user must type this (the object's name) to confirm. */
  confirmText?: string;
  /** Extra content under the description, such as a rule explanation. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("feedback.confirm");
  const inputId = useId();
  const [typed, setTyped] = useState("");
  // Opened from code, the dialog has no Radix trigger to return focus to, so
  // it remembers what had focus when it opened and focuses that on close.
  const returnFocus = useRef<HTMLElement | null>(null);
  const matches = confirmText === undefined || typed.trim() === confirmText;

  const changeOpen = (next: boolean) => {
    // A running action keeps the dialog open until the server answers.
    if (pending && !next) {
      return;
    }
    if (!next) {
      setTyped("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={() => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
      >
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (matches && !pending) {
              onConfirm();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          {confirmText !== undefined && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>
                {t("typeToConfirm", { text: confirmText })}
              </Label>
              <Input
                id={inputId}
                value={typed}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  setTyped(event.target.value);
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                changeOpen(false);
              }}
            >
              {cancelLabel ?? t("cancel")}
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={!matches || pending}
              aria-busy={pending || undefined}
              className="relative"
            >
              <span className={pending ? "invisible" : undefined}>
                {confirmLabel}
              </span>
              {pending && (
                <Loader2
                  aria-hidden="true"
                  className="absolute inset-0 m-auto size-4 animate-spin"
                />
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
