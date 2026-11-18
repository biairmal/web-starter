// Password length rules (TRD 12, BE TRD 10): 10 to 128 characters, no
// composition rules. Identity also refuses the 10k most common passwords; that
// check stays on the server and shows as PASSWORD_POLICY on the field.
// The forms use the lengths from `GET /v1/auth/config`; these constants apply
// when identity cannot be reached or sends none.

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
