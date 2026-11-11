// A short device name from a session's user agent, for the sessions list
// (DESIGN_BRIEF 7.6: "device and browser"). Only common browsers and systems
// are named; anything else is `undefined` and the list says "Unknown device".

export type Device = { browser?: string; os?: string };

// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari".
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

function first(
  table: readonly [RegExp, string][],
  value: string,
): string | undefined {
  return table.find(([pattern]) => pattern.test(value))?.[1];
}

export function describeDevice(userAgent: string | undefined): Device {
  if (!userAgent) {
    return {};
  }
  const browser = first(BROWSERS, userAgent);
  const os = first(SYSTEMS, userAgent);
  return {
    ...(browser === undefined ? {} : { browser }),
    ...(os === undefined ? {} : { os }),
  };
}
