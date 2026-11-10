// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import en from "../../messages/en.json";
import id from "../../messages/id.json";

const setLocale = vi.fn<(locale: unknown) => Promise<void>>(() =>
  Promise.resolve(),
);
const refresh = vi.fn();

vi.mock("@/i18n/actions", () => ({
  setLocale: (locale: unknown) => setLocale(locale),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function renderIn(locale: "en" | "id") {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : id}
      timeZone="UTC"
    >
      <LanguageSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    setLocale.mockClear();
    refresh.mockClear();
  });

  it("labels the control and shows the current language", () => {
    renderIn("en");
    const trigger = screen.getByRole("combobox", { name: "Language" });
    expect(trigger).toHaveTextContent("English");
  });

  it("uses the active locale's messages", () => {
    renderIn("id");
    expect(screen.getByRole("combobox", { name: "Bahasa" })).toHaveTextContent(
      "Bahasa Indonesia",
    );
  });

  it("stores the chosen locale and re-renders the route", async () => {
    const user = userEvent.setup();
    renderIn("en");
    await user.click(screen.getByRole("combobox", { name: "Language" }));
    await user.click(
      await screen.findByRole("option", { name: "Bahasa Indonesia" }),
    );
    await waitFor(() => {
      expect(setLocale).toHaveBeenCalledWith("id");
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });
});
