// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import { brand } from "@/config/brand";
import { ReasonBanner } from "@/features/auth/reason-banner";
import { renderWithIntl } from "../helpers/intl";

describe("ReasonBanner", () => {
  it("explains why the user is on sign-in", () => {
    renderWithIntl(<ReasonBanner reason="SESSION_ENDED" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your session ended. Sign in to continue.",
    );
  });

  it("fills in the support email", () => {
    renderWithIntl(<ReasonBanner reason="ACCOUNT_DISABLED" />);
    expect(screen.getByRole("status")).toHaveTextContent(brand.supportEmail);
  });

  it("shows nothing for a missing or unknown reason", () => {
    const { container } = renderWithIntl(
      <>
        <ReasonBanner reason={null} />
        <ReasonBanner reason="<script>alert(1)</script>" />
        <ReasonBanner reason="toString" />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("error.tsx", () => {
  it("offers try again, a way home and the reference to quote", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const error = Object.assign(new Error("secret detail"), {
      digest: "1234567",
    });
    renderWithIntl(<ErrorPage error={error} reset={reset} />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Something went wrong on our side",
      }),
    ).toBeInTheDocument();
    // Light and dark logos are both in the DOM; CSS shows one.
    expect(screen.getAllByRole("img", { name: brand.appName })).toHaveLength(2);
    expect(screen.getByText("Reference 1234567")).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).toBeNull();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Copy reference" }));
    await expect(navigator.clipboard.readText()).resolves.toBe("1234567");
  });
});

describe("global-error.tsx", () => {
  it("renders without any provider, in English", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    // It renders its own <html>; React puts it into the test document.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {
      /* React warns that <html> cannot be a child of <div> in a test. */
    });
    render(<GlobalError error={new Error("boom")} reset={reset} />);
    quiet.mockRestore();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Something went wrong on our side",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(brand.appName)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
