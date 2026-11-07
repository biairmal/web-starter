// Generated from openapi/identity.yaml by `pnpm api:gen`. Do not edit by hand.
// Regenerate after the spec changes; `pnpm api:check` fails when this file is stale.
export interface paths {
    "/.well-known/jwks.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Public signing keys
         * @description The RFC 7517 key set, published without the envelope because JWKS
         *     clients expect the bare form. Carries a five-minute Cache-Control.
         *     Next, active and retiring keys are all published, so a rotation is
         *     cached by resource services before the new key starts signing.
         */
        get: operations["getJWKS"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Liveness
         * @description The process is up. No dependency is checked.
         */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/readyz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Readiness
         * @description Not shutting down and the leader database is healthy. Redis is never a
         *     readiness check, so a cache outage does not take pods out of the load
         *     balancer.
         */
        get: operations["getReadiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/version": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Service version */
        get: operations["getVersion"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * What the sign-in screen should show
         * @description Nothing secret; the frontend renders its providers from this.
         */
        get: operations["getAuthConfig"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Register with a password
         * @description Rate limited. Always answers 202 with the same body whether or not the
         *     email is already taken, so the endpoint cannot be used to discover
         *     accounts. An existing address receives an "account already exists"
         *     email instead of a verification link.
         */
        post: operations["register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign in with a password
         * @description Rate limited per IP and per email. An unknown email and a wrong
         *     password return identical bodies. A locked account answers 401
         *     ACCOUNT_LOCKED with `meta.retry_after` and a `Retry-After` header;
         *     EMAIL_NOT_VERIFIED and ACCOUNT_DISABLED are only returned after a
         *     correct password.
         *
         *     In multi mode, a user who belongs to several tenants and named none
         *     gets 200 with `tenant_required` and the tenants to choose from, and no
         *     tokens. When a password change is forced, the access token is
         *     restricted to `POST /v1/me/password` and no refresh token is issued.
         */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/google/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Begin Google sign-in
         * @description Redirects to Google with state, nonce and a PKCE challenge.
         *     `redirect_to` must be in the configured frontend allow-list.
         */
        get: operations["googleStart"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/google/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Google redirects back here
         * @description Redirects to `redirect_to` with `code` (a single-use exchange code) on
         *     sign-in, `linked=1` after a link, or `error` (a `meta.reason` value) on
         *     failure. A missing, expired or reused state cannot name a redirect, so
         *     it answers 400 `OAUTH_STATE_INVALID` instead. Tokens never appear in a URL,
         *     because a URL ends up in browser history and server logs.
         */
        get: operations["googleCallback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/google/link/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Link Google to the signed-in account */
        get: operations["googleLinkStart"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/exchange": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Exchange a Google callback code for tokens
         * @description The code is single use and lives 60 seconds.
         */
        post: operations["exchange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Exchange a refresh token for a new pair
         * @description Rate limited per IP (`modules.auth.security.refresh_rate_limit`). The
         *     presented token is rotated; presenting it again within
         *     `modules.session.refresh_reuse_grace` returns a sibling token in the
         *     same family, after it revokes the whole family (401 REFRESH_REUSED).
         *     Roles, user status, membership and tenant are re-read, so a role
         *     change takes effect here. 401 INVALID_CREDENTIALS / REFRESH_REUSED /
         *     REFRESH_EXPIRED; 403 ACCOUNT_DISABLED / TENANT_SUSPENDED /
         *     PASSWORD_CHANGE_REQUIRED (forced password change: sign in again for
         *     the restricted token). A 403 revokes the family.
         */
        post: operations["refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign out of this device
         * @description Revokes the token's family. Idempotent, so an unknown, expired or already revoked token also returns 204. A body that is not JSON, has unknown fields or no refresh_token is a 400 like on every route (section 9.1).
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/logout-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign out everywhere
         * @description Revokes every family of the token's owner. Only a token that could still refresh signs anyone out; an unknown, expired or revoked token returns 204 and changes nothing. A malformed body is a 400.
         */
        post: operations["logoutAll"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/switch-tenant": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Switch to another tenant
         * @description Multi mode only. Starts a new refresh family for that tenant.
         */
        post: operations["switchTenant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/password/forgot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ask for a password reset link
         * @description Rate limited. Always 202, so the endpoint reveals nothing about an address.
         */
        post: operations["forgotPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/password/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Set a new password from a reset link
         * @description Rate limited. Revokes every refresh family of the user.
         */
        post: operations["resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/email/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Verify an email address */
        post: operations["verifyEmail"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/email/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Resend the verification email
         * @description Rate limited. Always 202 for a well-formed body, whatever the address
         *     (an invalid address included); only an existing unverified account is
         *     sent anything. A body that is not JSON, or has unknown fields, is a 400
         *     like on every route (section 9.1).
         */
        post: operations["resendVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/invite/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * What an invite is for
         * @description Lets the accept screen render. The email is masked, so a leaked link does not disclose it.
         */
        get: operations["getInvite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/invite/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Accept an invite */
        post: operations["acceptInvite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Service token for a resource service
         * @description Client credentials for the internal routes. The token carries the internal scope and lives five minutes. Never used by a browser.
         */
        post: operations["serviceToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** The calling user */
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update the calling user */
        patch: operations["updateMe"];
        trace?: never;
    };
    "/v1/me/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Change the password
         * @description Returns a fresh session and revokes every other family, so a stolen
         *     password cannot keep a session alive. Accepts the restricted token
         *     issued when a password change is forced.
         */
        post: operations["changePassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/tenants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tenants the caller belongs to */
        get: operations["listMyTenants"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** The caller's active sessions */
        get: operations["listMySessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Sign one device out */
        delete: operations["revokeMySession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/identities/google": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Unlink Google
         * @description Refused when it is the only remaining way to sign in. 204 also when nothing is linked.
         */
        delete: operations["unlinkGoogle"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List users in the tenant
         * @description Requires users:read. The search term matches the display name, or an exact email through the blind index.
         */
        get: operations["listUsers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Invite a user
         * @description Requires users:manage. Re-inviting resends the email without touching an existing password.
         */
        post: operations["inviteUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * One user
         * @description Requires users:read.
         */
        get: operations["getUser"];
        put?: never;
        post?: never;
        /**
         * Remove a user from the tenant
         * @description Requires users:manage. Removes the membership and the user's roles in
         *     this tenant; the account itself survives, because it may belong to
         *     other tenants.
         */
        delete: operations["removeUser"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/{id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace a user's roles
         * @description Requires users:manage. A full replacement. Refused when it would grant
         *     a permission the admin does not hold, change the admin's own roles,
         *     leave the tenant without a roles:manage holder, or touch the super
         *     admin.
         */
        put: operations["setUserRoles"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/{id}/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Disable a user
         * @description Requires users:manage. Disables the membership in the caller's tenant,
         *     not the account, and revokes their sessions in this tenant only.
         *     Refused for the super admin, for the last roles:manage holder of the
         *     tenant, and for yourself (SELF_ACTION).
         */
        post: operations["disableUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/{id}/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enable a user
         * @description Requires users:manage. A disabled membership becomes active again;
         *     any other is left alone.
         */
        post: operations["enableUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/users/{id}/revoke-sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign a user out everywhere
         * @description Requires users:manage. Also the way to make a role change take effect immediately rather than at the next refresh.
         */
        post: operations["revokeUserSessions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The permission catalog
         * @description Requires roles:manage. Admins compose roles from this list and cannot
         *     invent keys, because a key no service checks would do nothing.
         */
        get: operations["listPermissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List roles
         * @description Requires roles:manage.
         */
        get: operations["listRoles"];
        put?: never;
        /**
         * Create a role
         * @description Requires roles:manage. Only permissions the admin holds may be granted.
         */
        post: operations["createRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/roles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * One role
         * @description Requires roles:manage.
         */
        get: operations["getRole"];
        put?: never;
        post?: never;
        /**
         * Delete a role
         * @description Requires roles:manage. An assigned role needs the force flag, which
         *     removes the assignments in the same transaction.
         */
        delete: operations["deleteRole"];
        options?: never;
        head?: never;
        /**
         * Rename a role
         * @description Requires roles:manage and the current version. System roles cannot be edited.
         */
        patch: operations["updateRole"];
        trace?: never;
    };
    "/v1/admin/roles/{id}/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace a role's permissions
         * @description Requires roles:manage and the current version. A full replacement. An
         *     admin cannot grant a permission they do not hold, nor edit a role they
         *     hold that carries roles:manage.
         */
        put: operations["setRolePermissions"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the audit log
         * @description Requires audit:read. Newest first, scoped to the caller's tenant. The
         *     action filter accepts a like pattern, such as role.%
         */
        get: operations["listAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/tenants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List tenants
         * @description Super admin only. 404 in single mode.
         */
        get: operations["listTenants"];
        put?: never;
        /**
         * Create a tenant
         * @description Super admin only. Copies the role templates and invites the first
         *     admin in one transaction, so a tenant is never half set up.
         */
        post: operations["createTenant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/tenants/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** One tenant */
        get: operations["getTenant"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Rename or suspend a tenant
         * @description Suspending blocks sign-in and refresh for that tenant; existing access
         *     tokens die within their lifetime. The default tenant cannot be
         *     suspended.
         */
        patch: operations["updateTenant"];
        trace?: never;
    };
    "/v1/admin/role-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List role templates
         * @description Templates are copied into each new tenant; editing one does not change existing tenants.
         */
        get: operations["listRoleTemplates"];
        put?: never;
        /** Create a role template */
        post: operations["createRoleTemplate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/role-templates/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a role template */
        delete: operations["deleteRoleTemplate"];
        options?: never;
        head?: never;
        /**
         * Update a role template
         * @description Affects only tenants created afterwards.
         */
        patch: operations["updateRoleTemplate"];
        trace?: never;
    };
    "/v1/internal/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Look up a user
         * @description Service token only. Carries no email, because a resource service has no use for one.
         */
        get: operations["internalGetUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/internal/tenants/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Look up a tenant
         * @description Service token only. Lets a resource service see a suspension sooner than token expiry would.
         */
        get: operations["internalGetTenant"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/internal/roles/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A tenant's role to permission map
         * @description Service token only. Consumed by the go-sdk authz package with the
         *     identity source, which caches it, so access tokens can stay small and
         *     a role edit is picked up within the cache lifetime.
         */
        get: operations["internalRolePermissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Envelope: {
            /** Format: date-time */
            timestamp: string;
        };
        ErrorEnvelope: {
            /** Format: date-time */
            timestamp: string;
            error: {
                /**
                 * @description An errorz code; it selects the HTTP status.
                 * @example ERR_BAD_REQUEST
                 */
                code: string;
                /** @description For humans and logs. Never branch on it. */
                message: string;
                /** @description Machine-readable detail. */
                meta?: {
                    reason?: components["schemas"]["Reason"];
                    /** @description Per-field validation messages, keyed by JSON field name. */
                    fields?: {
                        [key: string]: string;
                    };
                    /** @description Seconds, on a rate-limited or locked-out response. */
                    retry_after?: number;
                } & {
                    [key: string]: unknown;
                };
            };
        };
        /**
         * @description The reason clients branch on (TRD 9.2).
         * @enum {string}
         */
        Reason: "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_DISABLED" | "PASSWORD_CHANGE_REQUIRED" | "TENANT_REQUIRED" | "TENANT_SUSPENDED" | "NOT_A_MEMBER" | "TOKEN_INVALID" | "REFRESH_REUSED" | "REFRESH_EXPIRED" | "PROVIDER_DISABLED" | "OAUTH_STATE_INVALID" | "OAUTH_EMAIL_UNVERIFIED" | "OAUTH_DOMAIN_NOT_ALLOWED" | "REGISTRATION_CLOSED" | "PASSWORD_POLICY" | "LAST_SIGN_IN_METHOD" | "PERMISSION_NOT_HELD" | "SELF_ESCALATION" | "LAST_ADMIN" | "SYSTEM_ROLE" | "ROLE_IN_USE" | "SUPER_ADMIN_PROTECTED" | "SELF_ACTION" | "ALREADY_MEMBER" | "VERSION_CONFLICT" | "DUPLICATE" | "RATE_LIMITED";
        PageResponse: {
            items: unknown[];
            total: number;
            page: number;
            size: number;
            total_pages: number;
            has_prev: boolean;
            has_next: boolean;
        };
        JWK: {
            /** @example RSA */
            kty: string;
            /** @example 2026-10-a */
            kid: string;
            /** @example sig */
            use: string;
            /** @example RS256 */
            alg: string;
            /** @description Modulus, base64url encoded. */
            n: string;
            /** @description Exponent, base64url encoded. */
            e: string;
        };
        AuthConfig: {
            providers: {
                password: boolean;
                google: boolean;
            };
            /** @description False means invite-only; the sign-up screen should 404. */
            registration: boolean;
            /** @enum {string} */
            tenancy: "single" | "multi";
        };
        RegisterRequest: {
            /** Format: email */
            email: string;
            /** Format: password */
            password: string;
            display_name: string;
            /** @description Required in multi mode; ignored in single mode. */
            tenant?: string;
        };
        LoginRequest: {
            /** Format: email */
            email: string;
            /** Format: password */
            password: string;
            /** @description Tenant slug. Multi mode, when the user has several. */
            tenant?: string;
        };
        RefreshRequest: {
            refresh_token: string;
        };
        TokenPayload: {
            access_token: string;
            /** @example Bearer */
            token_type: string;
            /**
             * @description Seconds
             * @example 900
             */
            expires_in: number;
            /** @description Omitted when a password change is forced. */
            refresh_token?: string;
            /** @example 2592000 */
            refresh_expires_in?: number;
            user: components["schemas"]["UserSummary"];
            tenant: components["schemas"]["TenantSummary"];
            /**
             * @description When true, the access token is restricted to the password change
             *     endpoint and no refresh token is issued.
             */
            must_change_password: boolean;
        };
        TenantChoice: {
            /** @constant */
            tenant_required: true;
            tenants: components["schemas"]["TenantSummary"][];
        };
        ServiceToken: {
            access_token: string;
            /** @example Bearer */
            token_type: string;
            /** @example 300 */
            expires_in: number;
        };
        UserSummary: {
            /** Format: uuid */
            id: string;
            display_name: string;
            /** Format: email */
            email?: string;
        };
        TenantSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
            /** @enum {string} */
            status?: "active" | "suspended";
        };
        Tenant: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
            /** @enum {string} */
            status: "active" | "suspended";
            member_count?: number;
            /** Format: date-time */
            created_at: string;
            version: number;
        };
        Me: {
            /** Format: uuid */
            id: string;
            /** Format: email */
            email: string;
            display_name: string;
            email_verified: boolean;
            is_super_admin: boolean;
            tenant: components["schemas"]["TenantSummary"];
            roles: string[];
            /** @description Effective permissions; the frontend hides what the user cannot do. */
            permissions: string[];
            providers: components["schemas"]["Providers"];
        };
        Providers: {
            password: boolean;
            google: boolean;
        };
        Session: {
            /**
             * Format: uuid
             * @description The family ID; deleting it signs that device out.
             */
            id: string;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            last_used_at?: string;
            user_agent?: string;
            ip?: string;
            current: boolean;
        };
        InvitePreview: {
            tenant: {
                name?: string;
            };
            /** @example b**@example.com */
            email_masked: string;
            /** @description False means the accept form must ask for a password. */
            has_password: boolean;
        };
        AdminUser: {
            /** Format: uuid */
            id: string;
            /** Format: email */
            email: string;
            display_name: string;
            /** @enum {string} */
            status: "pending" | "active" | "disabled";
            /** @enum {string} */
            membership_status: "invited" | "active" | "disabled" | "removed";
            roles: components["schemas"]["RoleRef"][];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            last_sign_in_at?: string;
        };
        AdminUserDetail: components["schemas"]["AdminUser"] & {
            providers: components["schemas"]["Providers"];
            version: number;
        };
        RoleRef: {
            /** Format: uuid */
            id: string;
            name: string;
        };
        RoleSummary: {
            /** Format: uuid */
            id: string;
            name: string;
            description?: string;
            is_system: boolean;
            permission_count: number;
            user_count: number;
            version: number;
        };
        Role: {
            /** Format: uuid */
            id: string;
            name: string;
            description?: string;
            /** @description System roles cannot be edited or deleted. */
            is_system: boolean;
            permissions: string[];
            version: number;
        };
        Permission: {
            /**
             * @description A resource and action, with an optional any scope.
             * @example notes:read:any
             */
            key: string;
            description: string;
            is_system: boolean;
        };
        AuditEntry: {
            /** Format: int64 */
            id: number;
            /** Format: date-time */
            at: string;
            /** @description Absent for anonymous events such as a failed sign-in. */
            actor?: {
                /** Format: uuid */
                id?: string;
                display_name?: string;
            };
            /** @example role.update */
            action: string;
            target_type?: string;
            target_id?: string;
            before?: {
                [key: string]: unknown;
            };
            after?: {
                [key: string]: unknown;
            };
            ip?: string;
            request_id?: string;
        };
        RolePermissionMap: {
            /** Format: uuid */
            tenant_id: string;
            /** @description Role name to permission keys. A role with no grants is an empty list. */
            roles: {
                [key: string]: string[];
            };
            version?: number;
        };
    };
    responses: {
        /** @description Accepted. The body is the same whether or not the address exists. */
        Accepted: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Envelope"] & {
                    data?: {
                        /** @example accepted */
                        status?: string;
                    };
                };
            };
        };
        /** @description A signed-in session */
        TokenResponse: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Envelope"] & {
                    data?: components["schemas"]["TokenPayload"];
                };
            };
        };
        /**
         * @description A signed-in session, or the tenants to choose from when the user
         *     belongs to several and named none.
         */
        TokenOrTenantChoice: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Envelope"] & {
                    data?: components["schemas"]["TokenPayload"] | components["schemas"]["TenantChoice"];
                };
            };
        };
        /**
         * @description Validation failed, or a one-time token is invalid. Reasons include
         *     TOKEN_INVALID, PASSWORD_POLICY and OAUTH_STATE_INVALID.
         */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /**
         * @description No, bad or expired credentials. Reasons include INVALID_CREDENTIALS,
         *     ACCOUNT_LOCKED, REFRESH_REUSED and REFRESH_EXPIRED.
         */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /**
         * @description Authenticated but not allowed. Reasons include EMAIL_NOT_VERIFIED,
         *     ACCOUNT_DISABLED, PASSWORD_CHANGE_REQUIRED, TENANT_SUSPENDED,
         *     NOT_A_MEMBER, REGISTRATION_CLOSED, PERMISSION_NOT_HELD,
         *     SELF_ESCALATION, SYSTEM_ROLE, SUPER_ADMIN_PROTECTED, SELF_ACTION,
         *     OAUTH_EMAIL_UNVERIFIED and OAUTH_DOMAIN_NOT_ALLOWED.
         */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /**
         * @description No such resource, or the route is inactive in this configuration. A
         *     resource outside the caller's tenant is also 404, never 403, so
         *     another tenant's IDs cannot be probed. Reason PROVIDER_DISABLED
         *     applies when a sign-in provider is off.
         */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /**
         * @description The change conflicts with the current state. Reasons include
         *     VERSION_CONFLICT, DUPLICATE, LAST_ADMIN, ROLE_IN_USE,
         *     LAST_SIGN_IN_METHOD and ALREADY_MEMBER.
         */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description The route needs an If-Match header or a body version, and neither was sent. */
        PreconditionRequired: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Rate limit hit. Reason RATE_LIMITED, with a Retry-After header. */
        RateLimited: {
            headers: {
                /** @description Seconds to wait. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Not ready, or a hard dependency is down. */
        Unavailable: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
    };
    parameters: {
        PathID: string;
        /** @description 1-based. */
        Page: number;
        Size: number;
        /**
         * @description The resource's current version, quoted. Required on updates to
         *     editable resources unless the version is in the body; missing is 428
         *     and a stale value is 409.
         */
        IfMatch: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getJWKS: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The key set */
            200: {
                headers: {
                    /** @example public, max-age=300 */
                    "Cache-Control"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        keys: components["schemas"]["JWK"][];
                    };
                };
            };
        };
    };
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Alive */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getReadiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ready */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            503: components["responses"]["Unavailable"];
        };
    };
    getVersion: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The running version */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: {
                            /** @example 1.4.0 */
                            version?: string;
                        };
                    };
                };
            };
        };
    };
    getAuthConfig: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Enabled providers and modes */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["AuthConfig"];
                    };
                };
            };
        };
    };
    register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequest"];
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            400: components["responses"]["BadRequest"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            200: components["responses"]["TokenOrTenantChoice"];
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    googleStart: {
        parameters: {
            query: {
                redirect_to: string;
                tenant?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Redirect to Google */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
        };
    };
    googleCallback: {
        parameters: {
            query: {
                code?: string;
                state: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Redirect to the frontend with a code or an error */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
        };
    };
    googleLinkStart: {
        parameters: {
            query: {
                redirect_to: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Redirect to Google */
            302: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    exchange: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    code: string;
                };
            };
        };
        responses: {
            200: components["responses"]["TokenResponse"];
            400: components["responses"]["BadRequest"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            200: components["responses"]["TokenResponse"];
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Signed out */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
        };
    };
    logoutAll: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Signed out of every device */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
        };
    };
    switchTenant: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    tenant_id: string;
                };
            };
        };
        responses: {
            200: components["responses"]["TokenResponse"];
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    forgotPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    token: string;
                    /** Format: password */
                    password: string;
                };
            };
        };
        responses: {
            /** @description Password changed */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    verifyEmail: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    token: string;
                };
            };
        };
        responses: {
            /** @description Verified */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
        };
    };
    resendVerification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            400: components["responses"]["BadRequest"];
            429: components["responses"]["RateLimited"];
        };
    };
    getInvite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The invite */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["InvitePreview"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    acceptInvite: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    token: string;
                    /**
                     * Format: password
                     * @description Required only when the account has no password yet.
                     */
                    password?: string;
                    display_name?: string;
                };
            };
        };
        responses: {
            200: components["responses"]["TokenResponse"];
            400: components["responses"]["BadRequest"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
        };
    };
    serviceToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    grant_type: "client_credentials";
                    client_id: string;
                    /** Format: password */
                    client_secret: string;
                };
            };
        };
        responses: {
            /** @description A service token */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["ServiceToken"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The user, their roles and their effective permissions */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Me"];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    updateMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    display_name?: string;
                };
            };
        };
        responses: {
            /** @description The updated user */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Me"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
        };
    };
    changePassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * Format: password
                     * @description Omitted when using the restricted token, or when the account has no password yet.
                     */
                    current_password?: string;
                    /** Format: password */
                    new_password: string;
                };
            };
        };
        responses: {
            200: components["responses"]["TokenResponse"];
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listMyTenants: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Active memberships */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["TenantSummary"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    listMySessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One entry per device */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Session"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
        };
    };
    revokeMySession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session revoked */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
        };
    };
    unlinkGoogle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Unlinked */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            409: components["responses"]["Conflict"];
        };
    };
    listUsers: {
        parameters: {
            query?: {
                /** @description 1-based. */
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
                /** @description Repeatable, field and direction. */
                sort?: ("display_name,ASC" | "display_name,DESC" | "created_at,ASC" | "created_at,DESC")[];
                status?: "pending" | "active" | "disabled";
                /** @description The membership in the caller's tenant. */
                membership_status?: "invited" | "active" | "disabled";
                role?: string;
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of users */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["PageResponse"] & {
                            items?: components["schemas"]["AdminUser"][];
                        };
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    inviteUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                    role_ids: string[];
                    display_name?: string;
                };
            };
        };
        responses: {
            /** @description Invited */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: {
                            /** @example invited */
                            status?: string;
                        };
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
        };
    };
    getUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The user */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["AdminUserDetail"];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    removeUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Removed */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    setUserRoles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    role_ids: string[];
                };
            };
        };
        responses: {
            /** @description The roles after the change */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: {
                            roles?: components["schemas"]["RoleRef"][];
                        };
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    disableUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Disabled */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    enableUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Enabled */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    revokeUserSessions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sessions revoked */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listPermissions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Every permission in the catalog */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Permission"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    listRoles: {
        parameters: {
            query?: {
                /** @description 1-based. */
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of roles */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["PageResponse"] & {
                            items?: components["schemas"]["RoleSummary"][];
                        };
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    createRole: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name: string;
                    description?: string;
                    permissions?: string[];
                };
            };
        };
        responses: {
            /** @description The created role */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
        };
    };
    getRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The role with its permissions */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    deleteRole: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    updateRole: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description The resource's current version, quoted. Required on updates to
                 *     editable resources unless the version is in the body; missing is 428
                 *     and a stale value is 409.
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name?: string;
                    description?: string;
                    /** @description An alternative to the If-Match header. */
                    version?: number;
                };
            };
        };
        responses: {
            /** @description The updated role */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            428: components["responses"]["PreconditionRequired"];
        };
    };
    setRolePermissions: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description The resource's current version, quoted. Required on updates to
                 *     editable resources unless the version is in the body; missing is 428
                 *     and a stale value is 409.
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    permissions: string[];
                    version?: number;
                };
            };
        };
        responses: {
            /** @description The updated role */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            428: components["responses"]["PreconditionRequired"];
        };
    };
    listAudit: {
        parameters: {
            query?: {
                /** @description 1-based. */
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
                actor?: string;
                action?: string;
                from?: string;
                to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of audit entries */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["PageResponse"] & {
                            items?: components["schemas"]["AuditEntry"][];
                        };
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
    listTenants: {
        parameters: {
            query?: {
                /** @description 1-based. */
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
                status?: "active" | "suspended";
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A page of tenants */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["PageResponse"] & {
                            items?: components["schemas"]["Tenant"][];
                        };
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    createTenant: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    slug: string;
                    name: string;
                    /** Format: email */
                    first_admin_email: string;
                };
            };
        };
        responses: {
            /** @description The created tenant */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Tenant"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
        };
    };
    getTenant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The tenant */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Tenant"];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateTenant: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description The resource's current version, quoted. Required on updates to
                 *     editable resources unless the version is in the body; missing is 428
                 *     and a stale value is 409.
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name?: string;
                    /** @enum {string} */
                    status?: "active" | "suspended";
                    version?: number;
                };
            };
        };
        responses: {
            /** @description The updated tenant */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Tenant"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            428: components["responses"]["PreconditionRequired"];
        };
    };
    listRoleTemplates: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Every template */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"][];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    createRoleTemplate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name: string;
                    description?: string;
                    permissions?: string[];
                };
            };
        };
        responses: {
            /** @description The created template */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
        };
    };
    deleteRoleTemplate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateRoleTemplate: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description The resource's current version, quoted. Required on updates to
                 *     editable resources unless the version is in the body; missing is 428
                 *     and a stale value is 409.
                 */
                "If-Match"?: components["parameters"]["IfMatch"];
            };
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name?: string;
                    description?: string;
                    permissions?: string[];
                    version?: number;
                };
            };
        };
        responses: {
            /** @description The updated template */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["Role"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            428: components["responses"]["PreconditionRequired"];
        };
    };
    internalGetUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The user */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            display_name?: string;
                            /** @enum {string} */
                            status?: "pending" | "active" | "disabled";
                        };
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    internalGetTenant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["PathID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The tenant */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["TenantSummary"];
                    };
                };
            };
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    internalRolePermissions: {
        parameters: {
            query: {
                tenant_id: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The map */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Envelope"] & {
                        data?: components["schemas"]["RolePermissionMap"];
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
        };
    };
}
