// Password length rules (TRD 12, BE TRD 10): 10 to 128 characters, no
// composition rules. Identity also refuses the 10k most common passwords; that
// check stays on the server and shows as PASSWORD_POLICY on the field.
// These constants apply until `GET /v1/auth/config` returns the lengths
// identity enforces (backend T9.5).

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
