import { describe, expect, it, vi } from "vitest";
import type { SessionMessage } from "@/lib/session-channel";
import {
  type SessionStatus,
  signInUrlFor,
  watchSessionMessages,
} from "@/lib/session-sync";

function setup(status: SessionStatus | null | Error = { signed_in: false }) {
  let deliver: ((message: SessionMessage) => void) | undefined;
  const target = new EventTarget();
  const deps = {
    subscribe: vi.fn((handler: (message: SessionMessage) => void) => {
      deliver = handler;
      return vi.fn();
    }),
    target: target as unknown as Window,
    checkSession: vi.fn(() =>
      status instanceof Error
        ? Promise.reject(status)
        : Promise.resolve(status),
    ),
    clearCache: vi.fn(),
    navigate: vi.fn<(url: string) => void>(),
    reload: vi.fn(),
    currentPath: () => "/admin/users?page=2",
  };
  const stop = watchSessionMessages(deps);
  return {
    deps,
    stop,
    send: (message: SessionMessage) => {
      deliver?.(message);
    },
    act: (type: "pointerdown" | "keydown" | "focus" = "pointerdown") => {
      target.dispatchEvent(new Event(type));
    },
  };
}

describe("watchSessionMessages", () => {
  it("does nothing until the user acts in this tab", () => {
    const { deps, send } = setup();
    send({ type: "signed-out" });
    expect(deps.checkSession).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it("FE-31 reloads on the next action after another tab switched tenant", async () => {
    const { deps, send, act } = setup({ signed_in: true });
    send({ type: "tenant-switched" });
    expect(deps.reload).not.toHaveBeenCalled();
    act("focus");
    await vi.waitFor(() => {
      expect(deps.reload).toHaveBeenCalledTimes(1);
    });
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it("FE-21 goes to sign-in on the next action when the session is gone", async () => {
    const { deps, send, act } = setup({ signed_in: false });
    send({ type: "signed-out" });
    act("keydown");
    await vi.waitFor(() => {
      expect(deps.navigate).toHaveBeenCalledWith(
        "/sign-in?next=%2Fadmin%2Fusers%3Fpage%3D2",
      );
    });
    expect(deps.clearCache).toHaveBeenCalledTimes(1);
  });

  it("keeps the reason of an ended session", async () => {
    const { deps, send, act } = setup({ signed_in: false });
    send({ type: "signed-out" });
    send({ type: "ended", reason: "REFRESH_REUSED" });
    act("focus");
    await vi.waitFor(() => {
      expect(deps.navigate).toHaveBeenCalledWith(
        "/sign-in?reason=REFRESH_REUSED&next=%2Fadmin%2Fusers%3Fpage%3D2",
      );
    });
  });

  it("reloads when this browser is still signed in", async () => {
    const { deps, send, act } = setup({ signed_in: true });
    send({ type: "signed-out" });
    act();
    await vi.waitFor(() => {
      expect(deps.reload).toHaveBeenCalledTimes(1);
    });
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.clearCache).not.toHaveBeenCalled();
  });

  it("goes to sign-in when the check fails", async () => {
    const { deps, send, act } = setup(new Error("offline"));
    send({ type: "signed-out" });
    act();
    await vi.waitFor(() => {
      expect(deps.navigate).toHaveBeenCalledTimes(1);
    });
  });

  it("acts once, however many events follow", async () => {
    const { deps, send, act } = setup({ signed_in: false });
    send({ type: "signed-out" });
    act();
    act("keydown");
    act();
    await vi.waitFor(() => {
      expect(deps.navigate).toHaveBeenCalledTimes(1);
    });
    expect(deps.checkSession).toHaveBeenCalledTimes(1);
  });

  it("stops listening when stopped", () => {
    const { deps, send, act, stop } = setup();
    send({ type: "signed-out" });
    stop();
    act();
    expect(deps.checkSession).not.toHaveBeenCalled();
  });
});

describe("signInUrlFor", () => {
  it("adds the reason only for an ended session", () => {
    expect(signInUrlFor({ type: "signed-out" }, "/")).toBe("/sign-in?next=%2F");
    expect(
      signInUrlFor({ type: "ended", reason: "SESSION_ENDED" }, "/account"),
    ).toBe("/sign-in?reason=SESSION_ENDED&next=%2Faccount");
  });
});
