// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { Toaster } from "@/components/ui/sonner";

// A toast says what happened before it is read: its icon takes the status
// colour (green, red, amber), from tokens only.

async function iconClass(show: () => void, message: string) {
  render(<Toaster />);
  await act(async () => {
    show();
    await Promise.resolve();
  });
  const item = (await screen.findByText(message)).closest(
    "[data-sonner-toast]",
  );
  return item?.querySelector("svg")?.getAttribute("class") ?? "";
}

describe("Toaster", () => {
  it("colours a success icon with the positive token", async () => {
    expect(await iconClass(() => toast.success("Saved"), "Saved")).toContain(
      "text-positive",
    );
  });

  it("colours an error icon with the negative token", async () => {
    expect(await iconClass(() => toast.error("Failed"), "Failed")).toContain(
      "text-negative",
    );
  });

  it("colours a warning icon with the warning token", async () => {
    expect(
      await iconClass(() => toast.warning("Careful"), "Careful"),
    ).toContain("text-warning");
  });

  it("uses tokens only, with no hex colour", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/ui/sonner.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe("Toaster placement", () => {
  it("sits at the top centre and closes after 4 seconds", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/ui/sonner.tsx"),
      "utf8",
    );
    expect(source).toContain('position="top-center"');
    expect(source).toContain("duration={4000}");
  });
});
