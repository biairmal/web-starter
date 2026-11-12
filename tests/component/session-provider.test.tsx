// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { SessionProvider, useMe } from "@/components/auth/session-provider";
import { createQueryClient } from "@/lib/api/query-client";
import { ME_REFETCH_INTERVAL, queryKeys } from "@/lib/api/query-keys";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

function DisplayName() {
  const me = useMe();
  return <p>{me.display_name}</p>;
}

function setup() {
  const client = createQueryClient({
    navigate: vi.fn(),
    currentPath: () => "/",
  });
  render(
    <QueryClientProvider client={client}>
      <SessionProvider me={meFixture}>
        <DisplayName />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return client;
}

describe("SessionProvider and useMe", () => {
  it("renders the server's Me at once, without a request", () => {
    // Any request would fail: the shared MSW server errors on unhandled ones.
    setup();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("FE-23 shows the refetched Me after it changes", async () => {
    server.use(
      http.get("*/api/id/me", () =>
        HttpResponse.json({
          timestamp: "2026-11-10T00:00:00Z",
          data: { ...meFixture, display_name: "Renamed User" },
        }),
      ),
    );
    const client = setup();
    await act(() => client.invalidateQueries({ queryKey: queryKeys.me }));
    expect(await screen.findByText("Renamed User")).toBeInTheDocument();
  });

  it("FE-23 refetches on window focus and every 5 minutes", () => {
    const client = setup();
    const query = client.getQueryCache().find({ queryKey: queryKeys.me });
    expect(query?.observers[0]?.options).toMatchObject({
      refetchOnWindowFocus: true,
      refetchInterval: ME_REFETCH_INTERVAL,
    });
    expect(ME_REFETCH_INTERVAL).toBe(5 * 60 * 1000);
  });

  it("fails loudly outside the provider", () => {
    const client = createQueryClient({
      navigate: vi.fn(),
      currentPath: () => "/",
    });
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {
      /* React logs the thrown error; the assertion below covers it. */
    });
    expect(() =>
      renderHook(useMe, {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      }),
    ).toThrow("useMe must be used inside SessionProvider");
    quiet.mockRestore();
  });
});
