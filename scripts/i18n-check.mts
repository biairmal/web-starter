import {
  SOURCE_LOCALE,
  compareLocales,
  readAllMessages,
} from "./i18n-keys.mts";

// Fails when a message key exists in en.json but not in another locale, or the
// other way round (TRD 12).
const { source, others } = readAllMessages();
const problems = compareLocales(source, others);

for (const problem of problems) {
  for (const key of problem.missing) {
    console.error(`messages/${problem.locale}.json is missing "${key}"`);
  }
  for (const key of problem.extra) {
    console.error(
      `messages/${problem.locale}.json has "${key}", which is not in ${SOURCE_LOCALE}.json`,
    );
  }
}

if (problems.length > 0) {
  process.exit(1);
}
console.log(
  `i18n:check: ${String(Object.keys(others).length + 1)} locales have the same keys as ${SOURCE_LOCALE}.json.`,
);
