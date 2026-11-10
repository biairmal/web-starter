import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  createQueryClient,
  sessionEndReason,
  signInUrl,
} from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  SESSION_CHANNEL_NAME,
  type SessionMessage,
} from "@/lib/session-channel";

function sessionEnded(cause: string): ApiError {
  return new ApiError({
    status: 401,
    code: "ERR_UNAUTHORIZED",
    reason: "SESSION_ENDED",
    sessionEndCause: cause,
  });
}

function setup(path = "/admin/users?page=2") {
  const navigate = vi.fn<(url: string) => void>();
  const client = createQueryClient({ navigate, currentPath: () => path });
  return { client, navigate };
}

/** Collects what other tabs would receive on the session channel. */
function listen(): { messages: SessionMessage[]; close: () => void } {
  const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  const messages: SessionMessage[] = [];
  channel.onmessage = (event: MessageEvent<SessionMessage>) => {
    messages.push(event.data);
  };
  return {
    messages,
    close: () => {
      channel.close();
    },
  };
}

const listeners: { close: () => void }[] = [];
afterEach(() => {
  for (const listener of listeners.splice(0)) {
    listener.close();
  }
});

describe("SESSION_ENDED handling", () => {
  it("clears the cache, tells other tabs and goes to sign-in with reason and next", async () => {
    const { client, navigate } = setup();
    const tabs = listen();
    listeners.push(tabs);
    client.setQueryData(["admin", "roles"], { cached: true });

    await expect(
      client.query({
        queryKey: queryKeys.me,
        queryFn: () => Promise.reject(sessionEnded("REFRESH_REUSED")),
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?reason=REFRESH_REUSED&next=%2Fadmin%2Fusers%3Fpage%3D2",
    );
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    await vi.waitFor(() => {
      expect(tabs.messages).toEqual([
        { type: "ended", reason: "REFRESH_REUSED" },
      ]);
    });
  });

  it("reacts to a failed mutation the same way", async () => {
    const { client, navigate } = setup("/account");
    await expect(
      client
        .getMutationCache()
        .build(client, {
          mutationFn: () => Promise.reject(sessionEnded("REFRESH_EXPIRED")),
        })
        .execute(undefined),
    ).rejects.toBeInstanceOf(ApiError);
    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?reason=REFRESH_EXPIRED&next=%2Faccount",
    );
  });

  it("navigates once when several requests fail together", async () => {
    const { client, navigate } = setup();
    await Promise.allSettled(
      ["a", "b", "c"].map((key) =>
        client.query({
          queryKey: [key],
          queryFn: () => Promise.reject(sessionEnded("NO_SESSION")),
        }),
      ),
    );
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("ignores other errors", async () => {
    const { client, navigate } = setup();
    await expect(
      client.query({
        queryKey: ["x"],
        queryFn: () =>
          Promise.reject(new ApiError({ status: 403, reason: "LAST_ADMIN" })),
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows SESSION_ENDED when the BFF found no session", () => {
    expect(sessionEndReason(sessionEnded("NO_SESSION"))).toBe("SESSION_ENDED");
    expect(sessionEndReason(new ApiError({ status: 401 }))).toBe(
      "SESSION_ENDED",
    );
    expect(signInUrl("SESSION_ENDED", "/")).toBe(
      "/sign-in?reason=SESSION_ENDED&next=%2F",
    );
  });
});

describe("retries", () => {
  it("does not retry a 4xx", async () => {
    const { client } = setup();
    const queryFn = vi.fn(() =>
      Promise.reject(new ApiError({ status: 404, reason: "NOT_ALLOWED" })),
    );
    await expect(
      client.query({ queryKey: ["nf"], queryFn, retryDelay: 0 }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx twice", async () => {
    const { client } = setup();
    const queryFn = vi.fn(() => Promise.reject(new ApiError({ status: 503 })));
    await expect(
      client.query({
        queryKey: ["down"],
        queryFn,
        retry: client.getDefaultOptions().queries?.retry,
        retryDelay: 0,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(queryFn).toHaveBeenCalledTimes(3);
  });
});
