// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  AsyncCombobox,
  type FetchOptions,
} from "@/components/ui/async-combobox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { renderWithIntl } from "../helpers/intl";

const FRUITS: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "durian", label: "Durian" },
];

function Single({ onChange }: { onChange?: (v: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      aria-label="Fruit"
      options={FRUITS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("Combobox", () => {
  it("picks an option with the keyboard alone", async () => {
    const onChange = vi.fn();
    renderWithIntl(<Single onChange={onChange} />);
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("ban");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("banana");
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveFocus();
    });
    expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
  });

  it("shows two chips and +N for more", () => {
    renderWithIntl(
      <Combobox
        aria-label="Fruits"
        multiple
        options={FRUITS}
        value={["apple", "banana", "cherry", "durian"]}
        onValueChange={() => undefined}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Fruits" });
    expect(trigger).toHaveTextContent("Apple");
    expect(trigger).toHaveTextContent("Banana");
    expect(trigger).not.toHaveTextContent("Cherry");
    expect(trigger).toHaveTextContent("+2");
  });
});

describe("AsyncCombobox", () => {
  it("names a preselected value through resolveLabels", async () => {
    const fetchOptions: FetchOptions = vi.fn(() =>
      Promise.resolve({ items: [], has_next: false }),
    );
    renderWithIntl(
      <AsyncCombobox
        aria-label="Owner"
        fetchOptions={fetchOptions}
        resolveLabels={(ids) =>
          Promise.resolve(ids.map((id) => ({ value: id, label: "Ayu" })))
        }
        value="u_1"
        onValueChange={() => undefined}
      />,
    );
    expect(
      await screen.findByRole("combobox", { name: "Owner" }),
    ).toHaveTextContent("Ayu");
    expect(fetchOptions).not.toHaveBeenCalled();
  });

  it("shows Retry after a failed load and loads again from it", async () => {
    const fetchOptions = vi
      .fn<FetchOptions>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ items: FRUITS, has_next: false });
    renderWithIntl(
      <AsyncCombobox
        aria-label="Fruit"
        fetchOptions={fetchOptions}
        value={null}
        onValueChange={() => undefined}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t load options.",
    );
    await user.click(screen.getByRole("option", { name: /retry/i }));
    expect(
      await screen.findByRole("option", { name: "Apple" }),
    ).toBeInTheDocument();
    expect(fetchOptions).toHaveBeenCalledTimes(2);
  });
});

describe("DatePicker", () => {
  it("sends an ISO date and shows it in the locale", async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<string | null>("2026-11-10");
      return (
        <DatePicker
          aria-label="Due"
          value={value}
          onValueChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      );
    }
    renderWithIntl(<Harness />);
    const trigger = screen.getByRole("button", { name: "Due" });
    expect(trigger).toHaveTextContent("Nov 10, 2026");
    const user = userEvent.setup();
    await user.click(trigger);
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-11-11");
  });
});

describe("DateRangePicker", () => {
  it("applies a preset as an ISO range", async () => {
    const onChange = vi.fn();
    renderWithIntl(
      <DateRangePicker
        aria-label="Created"
        value={null}
        onValueChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Created" }));
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));
    const range = onChange.mock.calls[0]?.[0] as { from: string; to: string };
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((Date.parse(range.to) - Date.parse(range.from)) / 86_400_000).toBe(
      6,
    );
  });
});

describe("DateRangePicker with a range already set", () => {
  function dayButton(iso: string) {
    const button = document.querySelector(`[data-day="${iso}"] button`);
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`no day ${iso}`);
    }
    return button;
  }

  it("starts a new range on the first click and ends it on the second", async () => {
    const onChange = vi.fn();
    renderWithIntl(
      <DateRangePicker
        aria-label="Created"
        value={{ from: "2026-11-03", to: "2026-11-05" }}
        onValueChange={onChange}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Created" }));
    await user.click(dayButton("2026-11-20"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(dayButton("2026-11-10"));
    expect(onChange).toHaveBeenCalledWith({
      from: "2026-11-10",
      to: "2026-11-20",
    });
  });

  it("has month and year selects", async () => {
    renderWithIntl(
      <DatePicker
        aria-label="Due"
        value="2026-11-10"
        onValueChange={() => undefined}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Due" }));
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    await user.selectOptions(selects[1] as HTMLSelectElement, "2030");
    expect(document.querySelector('[data-day="2030-11-10"]')).not.toBeNull();
  });
});
