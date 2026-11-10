// The phone form of a table, under 640px (DESIGN_BRIEF 6.2, FE-NFR-4): each
// row is a two-line item. Line 1 has the identity and the key value, line 2
// the remaining fields as a muted subline, the action at the end. Fields move
// to line 2; they are never dropped.

export type MobileCard = {
  title: React.ReactNode;
  /** The key value, at the end of line 1. */
  value?: React.ReactNode;
  /** The remaining fields, joined with " · " on line 2. */
  meta?: readonly React.ReactNode[];
  action?: React.ReactNode;
};

export function MobileCards<T>({
  rows,
  getRowId,
  card,
  label,
  className,
}: {
  rows: readonly T[];
  getRowId: (row: T) => string;
  card: (row: T) => MobileCard;
  /** The list's accessible name, the same as the table's caption. */
  label: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={className}>
      {rows.map((row) => {
        const content = card(row);
        const meta = (content.meta ?? []).filter(
          (item) => item !== null && item !== undefined && item !== "",
        );
        return (
          <li
            key={getRowId(row)}
            className="flex min-h-16 items-center gap-3 border-b border-rule py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-body font-medium">
                  {content.title}
                </span>
                {content.value !== undefined && (
                  <span className="shrink-0 text-body tabular-nums">
                    {content.value}
                  </span>
                )}
              </div>
              {meta.length > 0 && (
                <p className="truncate text-small text-muted-foreground">
                  {meta.map((item, index) => (
                    // Fields are in a fixed order, so the index is stable.
                    <span key={index}>
                      {index > 0 && <span aria-hidden="true">{" · "}</span>}
                      {item}
                    </span>
                  ))}
                </p>
              )}
            </div>
            {content.action !== undefined && (
              <div className="shrink-0">{content.action}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
