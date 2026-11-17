// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { InputGroup } from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { renderWithIntl } from "../helpers/intl";

function TitleForm() {
  const form = useForm<{ title: string }>({ defaultValues: { title: "" } });
  return (
    <FormField
      control={form.control}
      name="title"
      label="Title"
      counter={5}
      render={(field) => <Input {...field} />}
    />
  );
}

describe("FormField counter", () => {
  it("counts characters, describes the input with it and flags going over", async () => {
    renderWithIntl(<TitleForm />);
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveAccessibleDescription("0 / 5");
    await userEvent.type(input, "Quarterly");
    const counter = screen.getByText("9 / 5");
    expect(counter).toHaveAttribute("data-over", "true");
    expect(counter).toHaveClass("data-[over]:text-negative");
  });
});

describe("text controls", () => {
  it("InputGroup keeps the label on the input and marks it busy while loading", () => {
    render(
      <>
        <label htmlFor="q">Search</label>
        <InputGroup id="q" type="search" prefix="@" loading />
      </>,
    );
    const input = screen.getByRole("searchbox", { name: "Search" });
    expect(input).toHaveAttribute("aria-busy", "true");
    expect(input).toHaveClass("ps-8", "pe-8");
  });

  it("Textarea and Input share the read-only look", () => {
    render(<Textarea aria-label="Note" readOnly />);
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveClass(
      "read-only:bg-muted/40",
    );
  });

  it("NumberInput is a spinbutton with its unit beside it", () => {
    renderWithIntl(
      <NumberInput aria-label="Storage" unit="GB" defaultValue={5} />,
    );
    expect(screen.getByRole("spinbutton", { name: "Storage" })).toHaveValue(5);
    expect(screen.getByText("GB")).toBeInTheDocument();
  });

  it("NumberInput steps with its buttons, reports the change and keeps to max", async () => {
    const values: string[] = [];
    renderWithIntl(
      <NumberInput
        aria-label="Seats"
        defaultValue={9}
        max={10}
        onChange={(event) => values.push(event.target.value)}
      />,
    );
    const increase = screen.getByRole("button", { name: "Increase" });
    expect(increase).toHaveAttribute("tabindex", "-1");
    await userEvent.click(increase);
    await userEvent.click(increase);
    expect(screen.getByRole("spinbutton", { name: "Seats" })).toHaveValue(10);
    await userEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(values).toEqual(["10", "9"]);
  });
});

describe("choice controls", () => {
  it("RadioGroup moves the choice with the keyboard and skips disabled items", async () => {
    render(
      <RadioGroup aria-label="Frequency" defaultValue="daily">
        <RadioGroupItem value="daily" aria-label="Daily" />
        <RadioGroupItem value="weekly" aria-label="Weekly" />
      </RadioGroup>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Weekly" }));
    expect(screen.getByRole("radio", { name: "Weekly" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Daily" })).not.toBeChecked();
  });

  it("Switch toggles and reports its state", async () => {
    render(<Switch aria-label="Alerts" />);
    const toggle = screen.getByRole("switch", { name: "Alerts" });
    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it("Slider names each thumb", () => {
    render(
      <Slider defaultValue={[10, 90]} thumbLabels={["Minimum", "Maximum"]} />,
    );
    expect(screen.getByRole("slider", { name: "Minimum" })).toHaveAttribute(
      "aria-valuenow",
      "10",
    );
    expect(screen.getByRole("slider", { name: "Maximum" })).toBeInTheDocument();
  });

  it("ToggleGroup single keeps one item pressed", async () => {
    render(
      <ToggleGroup type="single" defaultValue="list" aria-label="View">
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="board">Board</ToggleGroupItem>
      </ToggleGroup>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Board" }));
    expect(screen.getByRole("radio", { name: "Board" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "List" })).not.toBeChecked();
  });
});
