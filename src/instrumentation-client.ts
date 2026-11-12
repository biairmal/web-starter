import { z } from "zod";

// Runs in the browser before any app code. Zod probes for `new Function`
// before its first object parse; under the production CSP (no
// 'unsafe-eval', TRD 11.2) the browser blocks the probe and reports a
// violation even though Zod catches it. jitless skips the probe and the JIT.
// Development allows eval, so only the production build showed it.
z.config({ jitless: true });
