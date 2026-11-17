// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CardGridSkeleton,
  DetailSkeleton,
  FormSkeleton,
} from "@/components/feedback/page-skeleton";
import { ERROR_TOAST } from "@/lib/toast";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressSteps } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { renderWithIntl } from "../helpers/intl";

describe("Avatar", () => {
  it("is one image named by the person, showing initials", () => {
    render(<Avatar name="Ayu Lestari" />);
    const avatar = screen.getByRole("img", { name: "Ayu Lestari" });
    expect(avatar).toHaveTextContent("AL");
  });

  it("is hidden when decorative", () => {
    render(<Avatar name="Ayu Lestari" decorative />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("groups shows at most max and a +N count", () => {
    render(
      <AvatarGroup
        label="5 people"
        max={2}
        people={[
          { name: "A One" },
          { name: "B Two" },
          { name: "C Three" },
          { name: "D Four" },
          { name: "E Five" },
        ]}
      />,
    );
    const group = screen.getByRole("group", { name: "5 people" });
    expect(group.querySelectorAll("[data-slot=avatar]")).toHaveLength(2);
    expect(group).toHaveTextContent("+3");
  });
});

describe("Badge", () => {
  it("uses the pill tokens for a status and draws a hidden dot", () => {
    render(
      <Badge variant="positive" dot>
        Active
      </Badge>,
    );
    const badge = screen.getByText("Active");
    expect(badge.className).toContain("bg-pill-positive");
    expect(badge.querySelector("[aria-hidden=true]")).not.toBeNull();
  });
});

describe("Progress", () => {
  it("is a named progressbar with its value", () => {
    render(<Progress value={40} label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("has no value when the amount is unknown", () => {
    render(<Progress value={null} label="Export" />);
    expect(
      screen.getByRole("progressbar", { name: "Export" }),
    ).not.toHaveAttribute("aria-valuenow");
  });

  it("marks the current step", () => {
    render(
      <ProgressSteps
        label="Setup"
        steps={["One", "Two", "Three"]}
        current={1}
      />,
    );
    expect(screen.getByRole("list", { name: "Setup" })).toBeInTheDocument();
    expect(screen.getByText("Two").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});

describe("Spinner", () => {
  it("is a status that says Loading by default", () => {
    renderWithIntl(<Spinner />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("announces nothing when decorative", () => {
    renderWithIntl(<Spinner decorative />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("Alert", () => {
  it("announces a negative alert at once and others politely", () => {
    render(
      <>
        <Alert tone="negative" title="Sync failed" />
        <Alert tone="info" title="Heads up" />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Sync failed");
    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
  });
});

describe("Skeleton presets", () => {
  it.each([
    ["card grid", <CardGridSkeleton key="c" />],
    ["detail", <DetailSkeleton key="d" />],
    ["form", <FormSkeleton key="f" />],
  ])("%s is a busy status", (_, node) => {
    renderWithIntl(node);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});

describe("Error toasts", () => {
  it("stay until dismissed and show a close button", () => {
    expect(ERROR_TOAST).toEqual({
      duration: Number.POSITIVE_INFINITY,
      closeButton: true,
    });
  });
});
