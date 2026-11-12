# Adding a business module

A business module is a screen (or a few) backed by a resource service of your own, built from
[go-service-template](https://github.com/biairmal/go-service-template). The service trusts
identity's tokens; the browser never calls it. It calls the BFF, which adds the session's bearer
token, exactly as it does for identity (TRD 7.4, PRD FE-62).

The example module is **notes**, against go-service-template's notes API. Every step below names
the file the notes module uses, so you can copy it. Replace `notes` with your module's name
(lowercase letters, digits and hyphens) everywhere.

## Steps

### 1. Pin the service's API description

```sh
pnpm api:sync:notes      # = tsx scripts/api-sync-service.mts notes ../go-service-template/api/swagger/swagger.json
pnpm api:gen
```

`scripts/api-sync-service.mts <name> <spec file>` copies the service's `swagger.json` (Swagger
2.0, from `make swagger` in the service) or `openapi.json` into `openapi/<name>.json`, converting
Swagger 2.0 to OpenAPI 3, and records the commit in `openapi/<name>.source.json`. Add a
`api:sync:<name>` script to `package.json` with your service's path.

`pnpm api:gen` generates `src/lib/api/<name>-schema.d.ts` for every `openapi/<name>.json`. No
registration needed: `pnpm api:check` (part of `pnpm check`) then fails whenever the spec changes
without regenerated types.

### 2. Types

`src/features/notes/types.ts`: named aliases over the generated schema, so the module's code never
spells the generated names:

```ts
import type { components, paths } from "@/lib/api/notes-schema";
export type NotesPaths = paths;
export type Note = components["schemas"]["internal_module_note.NoteResponse"];
```

Never hand-write a type for a service payload.

### 3. Environment variable

`src/config/env-schema.ts`: add `<NAME>_INTERNAL_URL` (the service's cluster-internal origin), and
add it to `.env.example`. Make it required if the app is useless without the module; the notes
example keeps it optional and answers 503 `UPSTREAM_UNAVAILABLE` without it.

### 4. Proxy route

`src/app/api/notes/[...path]/route.ts` (shown with a required variable; the example's optional one
throws `BffError.upstreamUnavailable()` when it is unset):

```ts
export const { GET, POST, PUT, PATCH, DELETE } = createServiceProxy({
  prefix: "/v1",
  baseUrl: () => env.NOTES_INTERNAL_URL,
  allow: { allow: ["notes", "notes/**"] },
});
```

`/api/notes/<path>` goes to `NOTES_INTERNAL_URL/v1/<path>`. The allow-list names every path the
browser may reach; anything else is 404 `NOT_ALLOWED`. Never allow the service's `internal/*`
routes. The proxy does the rest: CSRF check, request ID, session refresh and the one retry on a
401, `If-Match`, `Cache-Control: no-store`. Middleware already refreshes the session for every
`/api/*` route, so nothing else changes there.

### 5. Browser client and query keys

`src/features/notes/use-notes.ts` creates the client once:

```ts
export const notesApi = createServiceClient<NotesPaths>("/api/notes");
```

Paths lose their `/v1` prefix: `notesApi.GET("/notes")` calls `/api/notes/notes`, which the proxy
sends to `/v1/notes`. A path the service does not have fails the type check.

`src/lib/api/query-keys.ts`: add one key family (`notes: { all, list }`) and a `staleTimes` entry.
Hooks take their keys from there; mutations invalidate `queryKeys.notes.all`.

### 6. Permission constants

`src/lib/authz/permissions.ts`: the service's keys (`NOTES_READ = "notes:read"`, …). Identity
must have them in its catalog (`modules.rbac.permissions` in identity's config) so an admin can
grant them in the role editor. Remember that `x:y:any` does not imply `x:y` (TRD 9).

### 7. Page and components

- `src/features/notes/*`: hooks and components. A feature may import from `lib` and
  `components`, never from another feature (lint enforces it).
- `src/app/(app)/notes/page.tsx`: thin; `await requirePermission(NOTES_READ)` then the feature's
  component. Gate buttons with `useCan(NOTES_WRITE)`; the service still decides.

### 8. Navigation entry

`src/config/nav.ts`: one entry with `href`, `labelKey`, a lucide icon and `permission`. The shell
shows it only to users who hold the permission.

### 9. Messages

`messages/en.json` and `messages/id.json`: a `notes` namespace for the module's text, and the nav
label under `nav.items.notes`. `pnpm i18n:check` fails when a key is in `en` but not in `id`.

### 10. Tests

- Component tests: `tests/component/notes.test.tsx` (MSW answers `*/api/notes/*`).
- Proxy route test: `tests/unit/notes-proxy.test.ts`, with `NOTES_INTERNAL_URL` set to a host
  only MSW answers in `vitest.config.mts` (`testEnv`).
- Mock e2e: `tests/e2e/mock/notes.spec.ts`. `pnpm mock:notes` serves the spec with Prism on
  port 4012, started by `playwright.config.ts`; `tests/e2e/env.ts` points `NOTES_INTERNAL_URL` at
  it. Add a `mock:<name>` script and a `webServer` entry for your service the same way.

### 11. Deploy

Set `<NAME>_INTERNAL_URL` in `deploy/compose.yaml` and `deploy/helm/values.yaml` (`env:`).

## Removing the notes example

Delete `src/features/notes/`, `src/app/(app)/notes/`, `src/app/api/notes/`,
`tests/component/notes.test.tsx`, `tests/unit/notes-proxy.test.ts`, `tests/e2e/mock/notes.spec.ts`,
`openapi/notes*.json` and `src/lib/api/notes-schema.d.ts`. The app builds without them. Then
remove, in any order: the `notes` entry in `src/config/nav.ts`, the `NOTES_*` constants,
`queryKeys.notes` and `staleTimes.notes`, `NOTES_INTERNAL_URL` from `env-schema.ts`,
`.env.example`, `vitest.config.mts` and `tests/e2e/env.ts`, the notes `webServer` in
`playwright.config.ts`, the `api:sync:notes` and `mock:notes` scripts, and the `notes` message
namespaces.
