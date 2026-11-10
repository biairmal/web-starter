"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import { PAGE_SIZES } from "@/components/data-table/use-list-params";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Page } from "@/lib/api/types";

// "1–25 of 1,284", the page size and previous/next (DESIGN_BRIEF 6.2).

export type PageMeta = Omit<Page<unknown>, "items">;

export function Pagination({
  page,
  onPageChange,
  onSizeChange,
}: {
  page: PageMeta;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}) {
  const t = useTranslations("dataTable.pagination");
  const format = useFormatter();
  const sizeId = useId();
  const from = page.total === 0 ? 0 : (page.page - 1) * page.size + 1;
  const to = Math.min(page.page * page.size, page.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-body text-muted-foreground">
      <p aria-live="polite">
        {t("range", {
          from: format.number(from),
          to: format.number(to),
          total: format.number(page.total),
        })}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={sizeId}>{t("perPage")}</label>
          <Select
            value={String(page.size)}
            onValueChange={(value) => {
              onSizeChange(Number(value));
            }}
          >
            <SelectTrigger id={sizeId} size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {format.number(size)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("previous")}
            disabled={!page.has_prev}
            onClick={() => {
              onPageChange(page.page - 1);
            }}
          >
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("next")}
            disabled={!page.has_next}
            onClick={() => {
              onPageChange(page.page + 1);
            }}
          >
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}
