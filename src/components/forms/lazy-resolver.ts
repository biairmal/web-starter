import type { FieldValues, Resolver } from "react-hook-form";

/**
 * A React Hook Form resolver that loads the real one on first use. Lets a
 * light page (sign-in, TRD 12) keep Zod out of its first load: the schema
 * module is fetched when the user first leaves a field or submits.
 */
export function lazyResolver<Values extends FieldValues>(
  load: () => Promise<Resolver<Values>>,
): Resolver<Values> {
  let loading: Promise<Resolver<Values>> | undefined;
  return async (values, context, options) => {
    loading ??= load();
    const resolver = await loading;
    return resolver(values, context, options);
  };
}
