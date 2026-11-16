// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicFrame } from "@/components/layout/public-frame";
import { brand } from "@/config/brand";
import { renderWithIntl } from "../helpers/intl";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("PublicFrame", () => {
  it("puts the logo and the screen's content in one white card on the tinted ground", () => {
    renderWithIntl(
      <PublicFrame>
        <p>{"Sign in to continue"}</p>
      </PublicFrame>,
    );
    const card = screen
      .getByText("Sign in to continue")
      .closest('[data-slot="public-card"]');
    expect(card).not.toBeNull();
    expect(card?.className).toContain("rounded-xl");
    expect(card?.className).toContain("border");
    expect(card?.className).toContain("bg-background");
    expect(card?.querySelector(`img[alt="${brand.appName}"]`)).not.toBeNull();
  });

  it("keeps the support footer outside the card", () => {
    renderWithIntl(
      <PublicFrame>
        <p>{"Body"}</p>
      </PublicFrame>,
    );
    const support = screen.getByRole("link", { name: /support/i });
    expect(support.closest('[data-slot="public-card"]')).toBeNull();
  });

  it("stays a server component, so the sign-in page loads no extra code", () => {
    expect(read("src/components/layout/public-frame.tsx")).not.toContain(
      "use client",
    );
    expect(read("src/components/layout/wordmark.tsx")).not.toContain(
      "use client",
    );
  });
});

describe("global error page", () => {
  it("gives its retry button hover and pressed states", () => {
    const source = read("src/app/global-error.tsx");
    expect(source).toContain("hover:bg-primary-hover");
    expect(source).toContain("active:bg-primary-press");
  });
});
