import { resolveTestDatabaseUrl } from "./testDatabase.js";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = resolveTestDatabaseUrl();
