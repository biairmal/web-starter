// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { ApiError } from "@/lib/api/errors";

type Values = { email: string; newPassword: string };

function policyError(fields: Record<string, string>): ApiError {
  return new ApiError({ status: 422, reason: "PASSWORD_POLICY", fields });
}

function useTestForm() {
  return useForm<Values>({ defaultValues: { email: "", newPassword: "" } });
}

describe("applyServerErrors", () => {
  it("puts meta.fields on matching fields, mapping JSON names", () => {
    const { result } = renderHook(useTestForm);
    let outcome: ReturnType<typeof applyServerErrors<Values>> | undefined;
    act(() => {
      outcome = applyServerErrors(
        result.current,
        ["email", "newPassword"],
        policyError({
          new_password: "is a common password",
          email: "is not valid",
        }),
        { fieldMap: { new_password: "newPassword" } },
      );
    });
    expect(outcome).toEqual({
      applied: ["newPassword", "email"],
      unmatched: {},
    });
    expect(result.current.getFieldState("newPassword").error).toMatchObject({
      type: "server",
      message: "is a common password",
    });
    expect(result.current.getFieldState("email").error?.message).toBe(
      "is not valid",
    );
  });

  it("returns server fields the form does not have, for a form-level error", () => {
    const { result } = renderHook(useTestForm);
    let outcome: ReturnType<typeof applyServerErrors<Values>> | undefined;
    act(() => {
      outcome = applyServerErrors(
        result.current,
        ["email", "newPassword"],
        policyError({ tenant: "is suspended" }),
      );
    });
    expect(outcome).toEqual({
      applied: [],
      unmatched: { tenant: "is suspended" },
    });
    expect(result.current.getFieldState("email").error).toBeUndefined();
    expect(result.current.getFieldState("newPassword").error).toBeUndefined();
  });

  it("lets the caller replace the message", () => {
    const { result } = renderHook(useTestForm);
    act(() => {
      applyServerErrors(
        result.current,
        ["email"],
        new ApiError({
          status: 409,
          reason: "ALREADY_MEMBER",
          fields: { email: "already a member" },
        }),
        { message: () => "This person is already a member." },
      );
    });
    expect(result.current.getFieldState("email").error?.message).toBe(
      "This person is already a member.",
    );
  });

  it("does nothing for an error that is not an ApiError", () => {
    const { result } = renderHook(useTestForm);
    let outcome: ReturnType<typeof applyServerErrors<Values>> | undefined;
    act(() => {
      outcome = applyServerErrors(
        result.current,
        ["email"],
        new Error("offline"),
      );
    });
    expect(outcome).toEqual({ applied: [], unmatched: {} });
  });
});
