"use client";

import * as React from "react";
import { FileIcon, RotateCw, Upload, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Choosing and uploading files: drop them, click to choose, or paste. Each
// file is checked against `accept` and `maxSize` before it is sent, then
// uploaded by `onUpload` with its own progress, cancel and retry. `value` is
// the files already stored; the component adds to it as uploads finish.
// "avatar" is the same flow with one photo and a round preview.

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  /** Where the stored file can be shown, e.g. an image thumbnail. */
  url?: string;
};

export type UploadFile = (
  file: File,
  context: {
    /** From 0 to 1. Not calling it shows a bar of unknown length. */
    onProgress: (fraction: number) => void;
    signal: AbortSignal;
  },
) => Promise<{ id: string; url?: string }>;

type Pending = {
  key: string;
  file: File;
  /** A data URL of an image, which the page's CSP allows; blob URLs it does not. */
  preview: string | undefined;
  status: "uploading" | "failed" | "rejected";
  progress: number | null;
  reason?: "type" | "size" | "count";
  controller?: AbortController;
};

/** Whether a file matches an `accept` list: ".pdf", "image/*" or "image/png". */
export function acceptsFile(file: File, accept: string | undefined): boolean {
  if (!accept) {
    return true;
  }
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .some((rule) =>
      rule.startsWith(".")
        ? name.endsWith(rule)
        : rule.endsWith("/*")
          ? type.startsWith(rule.slice(0, -1))
          : type === rule,
    );
}

let nextKey = 0;

function FileUpload({
  value,
  onValueChange,
  onUpload,
  multiple = false,
  accept,
  maxSize,
  maxFiles,
  hint,
  variant = "dropzone",
  name,
  disabled = false,
  id,
  className,
  ...aria
}: {
  value: readonly UploadedFile[];
  onValueChange: (files: UploadedFile[]) => void;
  onUpload: UploadFile;
  /** Several files; otherwise a new file replaces the stored one. */
  multiple?: boolean;
  /** The native `accept` list, checked again here: ".pdf,image/*". */
  accept?: string;
  /** The largest file, in bytes. */
  maxSize?: number;
  /** With `multiple`, the most files, stored and uploading together. */
  maxFiles?: number;
  /** What may be uploaded, e.g. "PNG or JPG". The size limit is added. */
  hint?: string;
  variant?: "dropzone" | "avatar";
  /** The avatar variant's person, for the initials shown without a photo. */
  name?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
}) {
  const t = useTranslations("forms.upload");
  const format = useFormatter();
  const input = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<Pending[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const one = !multiple || variant === "avatar";

  // Uploads can finish between renders; each builds on the newest list.
  const stored = React.useRef(value);
  stored.current = value;
  const pendingRef = React.useRef(pending);
  pendingRef.current = pending;
  const upload = React.useRef(onUpload);
  upload.current = onUpload;

  React.useEffect(
    () => () => {
      for (const item of pendingRef.current) {
        item.controller?.abort();
      }
    },
    [],
  );

  const size = (bytes: number) =>
    bytes >= 1_000_000
      ? format.number(bytes / 1_000_000, {
          style: "unit",
          unit: "megabyte",
          maximumFractionDigits: 1,
        })
      : format.number(Math.max(1, Math.round(bytes / 1000)), {
          style: "unit",
          unit: "kilobyte",
        });

  const patch = (key: string, change: Partial<Pending>) => {
    setPending((list) =>
      list.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  };

  const drop = (key: string) => {
    pendingRef.current.find((entry) => entry.key === key)?.controller?.abort();
    setPending((list) => list.filter((entry) => entry.key !== key));
  };

  const send = (item: Pending) => {
    const controller = new AbortController();
    patch(item.key, { status: "uploading", progress: null, controller });
    upload
      .current(item.file, {
        signal: controller.signal,
        onProgress: (fraction) => {
          if (!controller.signal.aborted) {
            patch(item.key, { progress: Math.min(1, Math.max(0, fraction)) });
          }
        },
      })
      .then(
        (result) => {
          if (controller.signal.aborted) {
            return;
          }
          const done: UploadedFile = {
            id: result.id,
            name: item.file.name,
            size: item.file.size,
            ...(result.url ? { url: result.url } : {}),
          };
          const next = one ? [done] : [...stored.current, done];
          stored.current = next;
          onValueChange(next);
          drop(item.key);
        },
        () => {
          if (!controller.signal.aborted) {
            patch(item.key, { status: "failed", controller: undefined });
          }
        },
      );
  };

  const add = (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, one ? 1 : undefined);
    if (list.length === 0 || disabled) {
      return;
    }
    let room =
      one || maxFiles === undefined
        ? Number.POSITIVE_INFINITY
        : maxFiles -
          stored.current.length -
          pendingRef.current.filter((p) => p.status !== "rejected").length;
    const added = list.map((file): Pending => {
      const reason = !acceptsFile(file, accept)
        ? "type"
        : maxSize !== undefined && file.size > maxSize
          ? "size"
          : room <= 0
            ? "count"
            : undefined;
      if (!reason) {
        room -= 1;
      }
      nextKey += 1;
      return {
        key: `upload-${String(nextKey)}`,
        file,
        preview: undefined,
        status: reason ? "rejected" : "uploading",
        progress: null,
        ...(reason ? { reason } : {}),
      };
    });
    // One file at a time replaces whatever was in progress or rejected.
    if (one) {
      for (const item of pendingRef.current) {
        drop(item.key);
      }
    }
    setPending((current) => [...(one ? [] : current), ...added]);
    for (const item of added) {
      if (item.status !== "uploading") {
        continue;
      }
      send(item);
      if (item.file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            patch(item.key, { preview: reader.result });
          }
        };
        reader.readAsDataURL(item.file);
      }
    }
  };

  const browse = () => input.current?.click();

  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDragging(false);
      }
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      add(event.dataTransfer.files);
    },
    onPaste: (event: React.ClipboardEvent) => {
      if (event.clipboardData.files.length > 0) {
        event.preventDefault();
        add(event.clipboardData.files);
      }
    },
  };

  const reasonText = (item: Pending) =>
    item.reason === "type"
      ? t("wrongType")
      : item.reason === "size"
        ? t("tooBig", { size: size(maxSize ?? 0) })
        : item.reason === "count"
          ? t("tooMany", { max: maxFiles ?? 0 })
          : t("failed");

  const limits = [
    hint,
    maxSize === undefined
      ? undefined
      : t(one ? "maxSizeOne" : "maxSize", { size: size(maxSize) }),
  ]
    .filter(Boolean)
    .join(" · ");

  const hidden = (
    <input
      ref={input}
      type="file"
      tabIndex={-1}
      aria-hidden="true"
      className="sr-only"
      accept={accept}
      multiple={!one}
      disabled={disabled}
      onChange={(event) => {
        if (event.target.files) {
          add(event.target.files);
        }
        // Choosing the same file again must fire change again.
        event.target.value = "";
      }}
    />
  );

  if (variant === "avatar") {
    const item = pending[0];
    const photo = item?.preview ?? value[0]?.url;
    return (
      <div
        data-slot="file-upload"
        data-dragging={dragging || undefined}
        className={cn(
          "flex items-center gap-inline-lg rounded-md data-dragging:ring-2 data-dragging:ring-ring",
          className,
        )}
        {...dropHandlers}
      >
        {hidden}
        <Avatar name={name ?? ""} src={photo} size="xl" decorative />
        <div className="flex min-w-0 flex-col gap-stack-xs">
          <div className="flex flex-wrap items-center gap-inline-sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              id={id}
              disabled={disabled || item?.status === "uploading"}
              onClick={browse}
              {...aria}
            >
              <Upload aria-hidden="true" />
              {value.length > 0 ? t("changePhoto") : t("choosePhoto")}
            </Button>
            {value.length > 0 && !item && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onValueChange([]);
                }}
              >
                {t("removePhoto")}
              </Button>
            )}
          </div>
          {item?.status === "uploading" && (
            <Progress
              value={item.progress === null ? null : item.progress * 100}
              label={t("uploading", { name: item.file.name })}
              className="w-40"
            />
          )}
          {item && item.status !== "uploading" && (
            <p
              role="alert"
              className="flex items-center gap-inline-sm text-small text-destructive"
            >
              {reasonText(item)}
              {item.status === "failed" && (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="px-0"
                  onClick={() => {
                    send(item);
                  }}
                >
                  {t("retry", { name: item.file.name })}
                </Button>
              )}
            </p>
          )}
          {limits && (
            <p className="text-small text-muted-foreground">{limits}</p>
          )}
        </div>
      </div>
    );
  }

  const rows = [
    ...value.map((file) => ({ kind: "done" as const, file })),
    ...pending.map((item) => ({ kind: "pending" as const, item })),
  ];

  return (
    <div
      data-slot="file-upload"
      className={cn("flex flex-col gap-stack-sm", className)}
    >
      {hidden}
      <button
        type="button"
        id={id}
        disabled={disabled}
        data-dragging={dragging || undefined}
        onClick={browse}
        {...dropHandlers}
        {...aria}
        className="flex min-h-32 w-full flex-col items-center justify-center gap-stack-xs rounded-md border border-dashed border-dropzone bg-background px-inset-md py-stack-lg text-center not-disabled:hover:bg-raised focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 aria-invalid:border-destructive data-dragging:border-ring data-dragging:bg-accent"
      >
        <Upload aria-hidden="true" className="size-5 text-muted-foreground" />
        <span className="text-body font-medium">
          {dragging ? t("dropping") : one ? t("dropOne") : t("drop")}
        </span>
        {limits && (
          <span className="text-small text-muted-foreground">{limits}</span>
        )}
        <span className="text-small text-muted-foreground">{t("paste")}</span>
      </button>

      {rows.length > 0 && (
        <ul aria-label={t("files")} className="flex flex-col">
          {rows.map((row) => {
            const file = row.kind === "done" ? row.file : row.item.file;
            const key = row.kind === "done" ? row.file.id : row.item.key;
            const thumb = row.kind === "done" ? row.file.url : row.item.preview;
            const status = row.kind === "pending" ? row.item.status : "done";
            return (
              <li
                key={key}
                className="flex items-center gap-inline-md border-b border-rule py-stack-sm last:border-b-0"
              >
                {typeof thumb === "string" ? (
                  // A local or stored preview of the user's own image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="size-avatar-md shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <span className="grid size-avatar-md shrink-0 place-items-center rounded-sm bg-raised">
                    <FileIcon
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-inline-md">
                    <span className="truncate text-body">{file.name}</span>
                    <span className="shrink-0 text-small text-muted-foreground tabular-nums">
                      {size(file.size)}
                    </span>
                  </div>
                  {row.kind === "pending" && status === "uploading" && (
                    <Progress
                      value={
                        row.item.progress === null
                          ? null
                          : row.item.progress * 100
                      }
                      label={t("uploading", { name: file.name })}
                    />
                  )}
                  {row.kind === "pending" && status !== "uploading" && (
                    <span role="alert" className="text-small text-destructive">
                      {reasonText(row.item)}
                    </span>
                  )}
                </div>
                {row.kind === "pending" && status === "failed" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("retry", { name: file.name })}
                    onClick={() => {
                      send(row.item);
                    }}
                  >
                    <RotateCw aria-hidden="true" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={
                    status === "uploading"
                      ? t("cancel", { name: file.name })
                      : t("remove", { name: file.name })
                  }
                  onClick={() => {
                    if (row.kind === "done") {
                      onValueChange(value.filter((f) => f.id !== row.file.id));
                    } else {
                      drop(row.item.key);
                    }
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { FileUpload };
