import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";

// The sign-in form's rules. A module of its own so the form can load it, and
// Zod with it, on first validation (see lazyResolver).

export type SignInValues = { email: string; password: string };

export function signInResolver(messages: {
  emailInvalid: string;
  passwordRequired: string;
}): Resolver<SignInValues> {
  const schema = z.object({
    email: z
      .string()
      .trim()
      .pipe(z.email({ error: messages.emailInvalid })),
    password: z.string().min(1, { error: messages.passwordRequired }),
  });
  return zodResolver(schema);
}
