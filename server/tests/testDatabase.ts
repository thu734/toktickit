export function resolveTestDatabaseUrl(value = process.env.TEST_DATABASE_URL): string {
  const url = value || "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SAFETY BLOCK: Invalid test database URL.");
  }
  if (!["postgresql:", "postgres:"].includes(parsed.protocol) ||
      decodeURIComponent(parsed.pathname) !== "/toktickit_test") {
    throw new Error("SAFETY BLOCK: Tests must use the dedicated toktickit_test database.");
  }
  return url;
}
