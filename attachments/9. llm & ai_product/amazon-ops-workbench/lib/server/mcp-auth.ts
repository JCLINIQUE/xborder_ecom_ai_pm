import { z } from "zod";

export const bearerTokenSchema = z.string().trim().max(4096)
  .regex(/^[A-Za-z0-9._~+/=-]*$/).optional();

// Walk parsed JSON so quotes/backslashes in legacy URL credentials cannot
// corrupt the response while removing secrets from keys and nested values.
export function redactMcpCredentials(
  value: unknown,
  endpoint: URL,
  bearerToken?: string,
): unknown {
  const secrets = [
    endpoint.href,
    bearerToken,
    ...[...endpoint.searchParams.values()].filter((secret) => secret.length >= 8),
  ].filter((secret): secret is string => !!secret);
  const redactString = (text: string) => secrets.reduce(
    (redacted, secret) => redacted.split(secret).join("[授权信息已隐藏]"), text,
  );
  const visit = (item: unknown): unknown => {
    if (typeof item === "string") return redactString(item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object")
      return Object.fromEntries(Object.entries(item).map(
        ([key, entry]) => [redactString(key), visit(entry)],
      ));
    return item;
  };
  return visit(value);
}
