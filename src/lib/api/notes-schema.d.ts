// Generated from openapi/notes.json by `bun run api:gen`. Do not edit by hand.
// Regenerate after the spec changes; `bun run api:check` fails when this file is stale.
export interface paths {
    "/v1/notes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List notes
         * @description The caller's notes, or the tenant's with notes:read:any. Needs notes:read or notes:read:any.
         *     Filters: field=value;operator (the ; must be percent-encoded, %3B). No operator means eq.
         *     between takes "a,b" (inclusive); in takes "a,b,c" (each item percent-encoded, at most 100).
         *     Sortable: title, status, pinned, created_at, updated_at; repeatable; default updated_at,DESC.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Page, 1-based */
                    page?: number;
                    /** @description Page size, max modules.note.list_max_size */
                    size?: number;
                    /** @description field,ASC|DESC; repeatable */
                    sort?: string[];
                    /** @description Operators: eq, in. Note IDs */
                    id?: string;
                    /** @description Operators: eq, ne, like (contains, case-sensitive) */
                    title?: string;
                    /** @description Operators: eq. draft or archived */
                    status?: string;
                    /** @description Operators: eq. true or false */
                    pinned?: boolean;
                    /** @description Operators: eq. One owner's notes; needs notes:read:any */
                    owner_id?: string;
                    /** @description Operators: gt, gte, lt, lte, between. RFC 3339 date or timestamp */
                    created_at?: string;
                    /** @description Title or body contains, case-insensitive */
                    search?: string;
                    /** @description created_at >= this; RFC 3339 date or timestamp */
                    created_from?: string;
                    /** @description created_at < this; RFC 3339 date or timestamp */
                    created_to?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-internal_module_note_NotePageResponse"];
                    };
                };
                /** @description Unknown key, disallowed sort or filter, bad value or range */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No read permission, or owner_id without notes:read:any */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a note
         * @description Creates a note owned by the caller in the caller's tenant. Needs notes:write.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Request body */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["internal_module_note.CreateNoteRequest"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-internal_module_note_NoteResponse"];
                    };
                };
                /** @description Invalid body or validation error (meta.fields) */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No notes:write */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notes/bulk-delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Delete many notes
         * @description Deletes the given ids (1 to 100), or every note matching filter (a GET /v1/notes query string;
         *     page, size and sort ignored; at most 1000 rows, else 400 TOO_MANY_ROWS). Send exactly one.
         *     One transaction, no If-Match: last write wins. Ids out of reach come back as not_found.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description ids or filter */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["internal_module_note.BulkDeleteRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-internal_module_note_BulkDeleteResponse"];
                    };
                };
                /** @description Neither or both fields, bad ids or filter, TOO_MANY_ROWS */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No notes:write, or owner_id filter without notes:write:any */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notes/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Note options
         * @description Notes as {value: id, label: title} for dropdowns, in the list's scope, ordered by title then id.
         *     With ids, returns exactly those notes (search and paging ignored); unreachable ids are left out.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Title or body contains, case-insensitive */
                    search?: string;
                    /** @description Comma-separated note IDs, at most 100 */
                    ids?: string;
                    /** @description Page, 1-based */
                    page?: number;
                    /** @description Page size, default 20, max 50 */
                    size?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-internal_module_note_OptionPageResponse"];
                    };
                };
                /** @description Unknown key, bad page or size, bad or too many ids */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No notes:read or notes:read:any */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notes/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a note
         * @description One of the caller's notes, or any in the tenant with notes:read:any.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Note ID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-internal_module_note_NoteResponse"];
                    };
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No notes:read or notes:read:any */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No such note, or not the caller's */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete a note
         * @description Deletes one of the caller's notes, or any in the tenant with notes:write:any.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Note ID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description No Content */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No notes:write */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No such note, or not the caller's without notes:write:any */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a note
         * @description Changes the fields sent. If-Match carries the version read last; a stale one is 409.
         */
        patch: {
            parameters: {
                query?: never;
                header: {
                    /** @description Version, e.g. \ */
                    "If-Match": string;
                };
                path: {
                    /** @description Note ID */
                    id: string;
                };
                cookie?: never;
            };
            /** @description Fields to change */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["internal_module_note.UpdateNoteRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-internal_module_note_NoteResponse"];
                    };
                };
                /** @description Invalid body or validation error (meta.fields) */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Missing, invalid or expired token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No notes:write */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No such note, or not the caller's without notes:write:any */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description VERSION_CONFLICT */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description No If-Match */
                428: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["response.BaseResponse-any"];
                    };
                };
            };
        };
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        "internal_module_note.BulkDeleteFailure": {
            id?: string;
            /** @example not_found */
            reason?: string;
        };
        "internal_module_note.BulkDeleteRequest": {
            /** @example title=foo;like&created_at=2026-01-01,2026-02-01;between */
            filter?: string;
            ids?: string[];
        };
        "internal_module_note.BulkDeleteResponse": {
            affected?: number;
            failed?: components["schemas"]["internal_module_note.BulkDeleteFailure"][];
        };
        "internal_module_note.CreateNoteRequest": {
            body?: string;
            pinned?: boolean;
            /** @enum {string} */
            status?: "draft" | "archived";
            title: string;
        };
        "internal_module_note.NotePageResponse": {
            has_next?: boolean;
            has_prev?: boolean;
            items?: components["schemas"]["internal_module_note.NoteResponse"][];
            page?: number;
            size?: number;
            total?: number;
            total_pages?: number;
        };
        "internal_module_note.NoteResponse": {
            body?: string;
            created_at?: string;
            id?: string;
            owner_id?: string;
            pinned?: boolean;
            status?: string;
            title?: string;
            updated_at?: string;
            version?: number;
        };
        "internal_module_note.OptionPageResponse": {
            has_next?: boolean;
            has_prev?: boolean;
            items?: components["schemas"]["internal_module_note.OptionResponse"][];
            page?: number;
            size?: number;
            total?: number;
            total_pages?: number;
        };
        "internal_module_note.OptionResponse": {
            label?: string;
            value?: string;
        };
        "internal_module_note.UpdateNoteRequest": {
            body?: string;
            pinned?: boolean;
            /** @enum {string} */
            status?: "draft" | "archived";
            title?: string;
        };
        "response.BaseResponse-any": {
            code?: string;
            data?: unknown;
            error?: unknown;
            message?: string;
            timestamp?: string;
        };
        "response.BaseResponse-internal_module_note_BulkDeleteResponse": {
            code?: string;
            data?: components["schemas"]["internal_module_note.BulkDeleteResponse"];
            error?: unknown;
            message?: string;
            timestamp?: string;
        };
        "response.BaseResponse-internal_module_note_NotePageResponse": {
            code?: string;
            data?: components["schemas"]["internal_module_note.NotePageResponse"];
            error?: unknown;
            message?: string;
            timestamp?: string;
        };
        "response.BaseResponse-internal_module_note_NoteResponse": {
            code?: string;
            data?: components["schemas"]["internal_module_note.NoteResponse"];
            error?: unknown;
            message?: string;
            timestamp?: string;
        };
        "response.BaseResponse-internal_module_note_OptionPageResponse": {
            code?: string;
            data?: components["schemas"]["internal_module_note.OptionPageResponse"];
            error?: unknown;
            message?: string;
            timestamp?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
