// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SessionsList,
  SignOutEverywhere,
} from "@/features/account/sessions-list";
import { SignInMethods } from "@/features/account/sign-in-methods";
import type { Session } from "@/lib/api/types";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";
import { renderSignedIn } from "../helpers/signed-in";

const hardNavigate = vi.fn();
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/account/security",
  useRouter: () => ({ refresh: vi.fn(), replace }),
}));

const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const sessions: Session[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b2",
    created_at: "2026-11-01T00:00:00Z",
    last_used_at: "2026-11-10T00:00:00Z",
    user_agent: SAFARI_IPHONE,
    ip: "203.0.113.9",
    current: false,
  },
  {
    id: "00000000-0000-4000-8000-0000000000b1",
    created_at: "2026-11-11T00:00:00Z",
    last_used_at: "2026-11-11T00:00:00Z",
    user_agent: CHROME_WINDOWS,
    ip: "198.51.100.4",
    current: true,
  },
];

function envelope(data: unknown) {
  return { timestamp: "2026-11-11T00:00:00Z", data };
}

function errorBody(reason: string) {
  return {
    timestamp: "2026-11-11T00:00:00Z",
    error: { code: "ERR", message: "failed", meta: { reason } },
  };
}

beforeEach(() => {
  hardNavigate.mockClear();
  replace.mockClear();
});

describe("SessionsList", () => {
  it("FE-33 lists sessions with the current one first and marked", async () => {
    server.use(
      http.get("*/api/id/me/sessions", () =>
        HttpResponse.json(envelope(sessions)),
      ),
    );
    renderSignedIn(<SessionsList />, meFixture, "/account/security");
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [current, other] = rows as [HTMLElement, HTMLElement];
    expect(within(current).getByText("Chrome on Windows")).toBeInTheDocument();
    expect(within(current).getByText("Current session")).toBeInTheDocument();
    expect(
      within(current).getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
    expect(within(other).getByText("Safari on iOS")).toBeInTheDocument();
    expect(within(other).getByText(/^Last used /)).toBeInTheDocument();
    expect(within(other).getByText("203.0.113.9")).toBeInTheDocument();
  });

  it("FE-33 revokes another session and refreshes the list", async () => {
    let revoked: string | undefined;
    let list = sessions;
    server.use(
      http.get("*/api/id/me/sessions", () => HttpResponse.json(envelope(list))),
      http.delete("*/api/id/me/sessions/:id", ({ params }) => {
        revoked = String(params.id);
        list = sessions.filter((session) => session.current);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSignedIn(<SessionsList />, meFixture, "/account/security");
    await userEvent.setup().click(
      await screen.findByRole("button", {
        name: "Revoke the session on Safari on iOS",
      }),
    );
    expect(
      await screen.findByText("Safari on iOS was signed out."),
    ).toBeInTheDocument();
    expect(revoked).toBe("00000000-0000-4000-8000-0000000000b2");
    await waitFor(() => {
      expect(
        within(screen.getByRole("region", { name: "Sessions" })).getAllByRole(
          "listitem",
        ),
      ).toHaveLength(1);
    });
  });

  it("FE-22 the current session's action signs this device out", async () => {
    let loggedOut = false;
    server.use(
      http.get("*/api/id/me/sessions", () =>
        HttpResponse.json(envelope(sessions)),
      ),
      http.post("*/api/auth/logout", () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSignedIn(<SessionsList />, meFixture, "/account/security");
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/sign-in");
    });
    expect(loggedOut).toBe(true);
  });

  it("shows an error with a retry when the list fails", async () => {
    server.use(
      http.get("*/api/id/me/sessions", () =>
        HttpResponse.json(errorBody("NOT_ALLOWED"), { status: 404 }),
      ),
    );
    renderSignedIn(<SessionsList />, meFixture, "/account/security");
    expect(
      await screen.findByText("Couldn’t load your sessions."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("SignOutEverywhere", () => {
  it("FE-22 confirms with the number of other sessions, then signs out everywhere", async () => {
    let called = false;
    server.use(
      http.get("*/api/id/me/sessions", () =>
        HttpResponse.json(envelope(sessions)),
      ),
      http.post("*/api/auth/logout-all", () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSignedIn(<SignOutEverywhere />, meFixture, "/account/security");
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Sign out everywhere" }),
    );
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(
        within(dialog).getByText(
          "This ends 1 other session and signs you out on this device.",
        ),
      ).toBeInTheDocument();
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Sign out everywhere" }),
    );
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/sign-in");
    });
    expect(called).toBe(true);
  });
});

describe("SignInMethods", () => {
  it("FE-33 links Google through the BFF", () => {
    renderSignedIn(<SignInMethods googleEnabled />);
    expect(screen.getByRole("link", { name: "Link Google" })).toHaveAttribute(
      "href",
      "/api/auth/google/link",
    );
    expect(screen.getByRole("link", { name: "Change" })).toHaveAttribute(
      "href",
      "/account#password",
    );
  });

  it("hides Google when it is off and not linked", () => {
    renderSignedIn(<SignInMethods googleEnabled={false} />);
    expect(screen.queryByText("Google")).toBeNull();
  });

  it("FE-33 disables unlinking the last way to sign in, with the reason inline", () => {
    renderSignedIn(<SignInMethods googleEnabled />, {
      ...meFixture,
      providers: { password: false, google: true },
    });
    const unlink = screen.getByRole("button", { name: "Unlink" });
    expect(unlink).toBeDisabled();
    expect(unlink).toHaveAccessibleDescription(
      /Keep at least one way to sign in\./,
    );
    expect(
      screen.getByRole("link", { name: "Set a password first" }),
    ).toHaveAttribute("href", "/account#password");
  });

  it("FE-33 unlinks Google after confirming", async () => {
    let unlinked = false;
    server.use(
      http.delete("*/api/id/me/identities/google", () => {
        unlinked = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get("*/api/id/me", () =>
        HttpResponse.json(
          envelope({
            ...meFixture,
            providers: { password: true, google: false },
          }),
        ),
      ),
    );
    renderSignedIn(<SignInMethods googleEnabled />, {
      ...meFixture,
      providers: { password: true, google: true },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Unlink" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Unlink" }));
    expect(await screen.findByText("Google unlinked")).toBeInTheDocument();
    expect(unlinked).toBe(true);
    expect(
      await screen.findByRole("link", { name: "Link Google" }),
    ).toBeInTheDocument();
  });

  it("FE-33 LAST_SIGN_IN_METHOD from identity shows the guidance", async () => {
    server.use(
      http.delete("*/api/id/me/identities/google", () =>
        HttpResponse.json(errorBody("LAST_SIGN_IN_METHOD"), { status: 409 }),
      ),
    );
    renderSignedIn(<SignInMethods googleEnabled />, {
      ...meFixture,
      providers: { password: true, google: true },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Unlink" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Unlink",
      }),
    );
    expect(
      await screen.findByRole("link", { name: "Set a password first" }),
    ).toBeInTheDocument();
  });

  it("FE-33 toasts a finished link once and cleans the URL", async () => {
    renderSignedIn(<SignInMethods googleEnabled linked />);
    expect(await screen.findByText("Google linked")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/account/security", {
      scroll: false,
    });
  });

  it("FE-33 toasts a failed link with the reason", async () => {
    renderSignedIn(
      <SignInMethods googleEnabled linkError="OAUTH_EMAIL_UNVERIFIED" />,
    );
    expect(
      await screen.findByText("Google wasn’t linked."),
    ).toBeInTheDocument();
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
