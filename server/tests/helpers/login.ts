import { startTestServer } from "../testHttpServer.js";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

export async function loginAsUser(id: number) {
  const user = await getPrisma().user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash("Initial123!", 10), mustChangePassword: false },
  });
  const agent = request.agent(await startTestServer(app));
  await agent.post("/api/auth/login")
    .set("X-Requested-With", "XMLHttpRequest")
    .send({ email: user.email, password: "Initial123!" })
    .expect(200);
  return agent;
}
