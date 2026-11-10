// @vitest-environment jsdom
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import {
  PasswordRules,
  passwordRules,
} from "@/components/forms/password-rules";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { renderWithIntl } from "../helpers/intl";

type Values = { name: string };

let setNameError: ((message: string) => void) | undefined;

function NameForm() {
  const form = useForm<Values>({ defaultValues: { name: "" } });
  setNameError = (message) => {
    form.setError("name", { type: "server", message });
  };
  return (
    <form>
      <FormField
        control={form.control}
        name="name"
        label="Name"
        description="Shown to other members."
        required
        render={(field) => <Input {...field} />}
      />
    </form>
  );
}

describe("FormField", () => {
  it("labels the input and links its description", () => {
    renderWithIntl(<NameForm />);
    const input = screen.getByRole("textbox", { name: /Name/ });
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAccessibleDescription("Shown to other members.");
  });

  it("shows an error under the field, linked and marked invalid", () => {
    renderWithIntl(<NameForm />);
    act(() => {
      setNameError?.("That name is already taken.");
    });
    const input = screen.getByRole("textbox", { name: /Name/ });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Shown to other members. That name is already taken.",
    );
  });
});

describe("FormErrorSummary", () => {
  it("announces how many fields need attention and shows the form error", () => {
    renderWithIntl(
      <FormErrorSummary
        invalidCount={2}
        message="Email or password is incorrect."
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 fields need attention",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
  });
});

describe("password kit", () => {
  it("FE-4 checks the 10 to 128 character rule live", () => {
    expect(passwordRules("short")).toEqual([
      { key: "min", met: false },
      { key: "max", met: true },
    ]);
    expect(passwordRules("long enough")).toEqual([
      { key: "min", met: true },
      { key: "max", met: true },
    ]);
    expect(passwordRules("x".repeat(129))[1]?.met).toBe(false);
    expect(passwordRules("")[1]?.met).toBe(false);
    // Characters, not UTF-16 units: ten emoji are ten characters.
    expect(passwordRules("😀".repeat(10))[0]?.met).toBe(true);
    expect(passwordRules("😀".repeat(9))[0]?.met).toBe(false);
  });

  it("keeps every rule row in place while they flip", () => {
    const { rerender } = renderWithIntl(<PasswordRules value="" />);
    const rows = () => screen.getAllByRole("listitem");
    expect(rows()).toHaveLength(3);
    expect(rows()[0]).toHaveTextContent("At least 10 characters(not yet)");
    rerender(<PasswordRules value="correct horse" />);
    expect(rows()).toHaveLength(3);
    expect(rows()[0]).toHaveTextContent("At least 10 characters(done)");
    expect(rows()[2]).toHaveTextContent("Common passwords are not accepted");
  });

  it("uses the lengths it is given", () => {
    renderWithIntl(<PasswordRules value="" min={12} max={64} />);
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
    expect(screen.getByText("No more than 64 characters")).toBeInTheDocument();
  });

  it("shows and hides the password", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PasswordInput id="pw" aria-label="Password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SubmitButton", () => {
  it("keeps its label and is disabled only while pending", () => {
    const { rerender } = renderWithIntl(
      <SubmitButton pending={false}>{"Save role"}</SubmitButton>,
    );
    const button = screen.getByRole("button", { name: "Save role" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("type", "submit");
    rerender(<SubmitButton pending>{"Save role"}</SubmitButton>);
    expect(screen.getByRole("button", { name: "Save role" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save role" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
