import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import en from "../../messages/en.json";

/** Wraps children in next-intl with the English messages, as the app does. */
export function IntlWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

/** IntlWrapper plus a fresh QueryClient, as the root layout's Providers give. */
function IntlQueryWrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <IntlWrapper>{children}</IntlWrapper>
    </QueryClientProvider>
  );
}

export function renderWithIntl(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: IntlQueryWrapper, ...options });
}
