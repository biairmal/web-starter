import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";

// The new-password rule every auth form shares (TRD 12, BE TRD 10): length
// only, counted in code points as identity counts it. Common passwords are
// refused by identity and come back as PASSWORD_POLICY on the field.

export type PasswordMessages = {
  tooShort: string;
  tooLong: string;
};

export function newPasswordSchema(
  messages: PasswordMessages,
  min: number = PASSWORD_MIN_LENGTH,
  max: number = PASSWORD_MAX_LENGTH,
) {
  return z
    .string()
    .refine((value) => Array.from(value).length >= min, {
      error: messages.tooShort,
    })
    .refine((value) => Array.from(value).length <= max, {
      error: messages.tooLong,
    });
}
