import type { AppLocale } from "@/i18n/config";
import type en from "../../messages/en.json";

// Types every `t("…")` key against the English messages, so a missing or
// misspelled key fails the type check.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
  }
}
