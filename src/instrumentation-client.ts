import { config } from "zod/v4/core";

// Runs in the browser before any app code. Zod probes for `new Function`
// before its first object parse; under the production CSP (no
// 'unsafe-eval', TRD 11.2) the browser blocks the probe and reports a
// violation even though Zod catches it. jitless skips the probe and the JIT.
// Development allows eval, so only the production build showed it.
// Imported from zod/v4/core: the setting is global, and the core entry does
// not pull the rest of Zod into every page.
config({ jitless: true });
