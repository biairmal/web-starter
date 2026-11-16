import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every list and account page gets its one <h1> from PageHeader, so the header
// looks and wraps the same everywhere. Detail screens keep their own headers
// (they carry a back link and a status, not a title, text and action).

const pages = [
  "admin/users/page.tsx",
  "admin/roles/page.tsx",
  "admin/role-templates/page.tsx",
  "admin/tenants/page.tsx",
  "admin/audit/page.tsx",
  "notes/page.tsx",
  "account/page.tsx",
  "account/security/page.tsx",
  "page.tsx",
];

describe("page headers", () => {
  it.each(pages)("%s uses PageHeader and has no hand-built h1", (page) => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(app)", page),
      "utf8",
    );
    expect(source).toContain('from "@/components/layout/page-header"');
    expect(source).not.toContain("<h1");
  });
});
