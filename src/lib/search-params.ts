/** The page props Next.js passes for the query string. */
export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

/** The first value of a query parameter, if any. */
export function param(
  params: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = params[name];
  return Array.isArray(value) ? value[0] : value;
}
