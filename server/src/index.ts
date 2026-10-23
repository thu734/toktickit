import { app } from "./app.js";

if (!process.env.DATABASE_URL) {
  console.error("API startup failed: DATABASE_URL is missing. Use npm run dev from server/ to load server/.env, or supply deployment environment variables.");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;

export const server = app.listen(PORT, () => {
  console.log(`TokTickIT API listening on http://localhost:${PORT}`);
});
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(error.code === "EADDRINUSE"
    ? `API startup failed: port ${PORT} is already in use. Stop the existing API or choose another PORT.`
    : "API startup failed: unable to listen. Check the host and port configuration.");
  process.exit(1);
});
