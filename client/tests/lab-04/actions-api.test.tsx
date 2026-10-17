import { afterEach, describe, expect, it, vi } from "vitest";
import { createAction, fetchActions, fetchStaffUsers, updateAction } from "../../src/api";

afterEach(() => vi.unstubAllGlobals());
function response(status: number, data: unknown) {
  const mock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => data });
  vi.stubGlobal("fetch", mock);
  return mock;
}
describe("Actions client contract", () => {
  it("retrieves the list and revision with session cookies", async () => {
    const data = { actions: [], workflowRevision: 8 };
    const mock = response(200, data);
    expect(await fetchActions(7)).toEqual(data);
    expect(mock).toHaveBeenCalledWith(expect.stringContaining("/api/tickets/7/actions-taken"), { method: "GET", credentials: "include" });
  });
  it("creates with the supplied stable key and revision, without inventing identity", async () => {
    const mock = response(201, { action: { id: 4 }, workflowRevision: 9 });
    const payload = { description: "Inspect", workflowRevision: 8, requestKey: "one-operation", assignedToId: null };
    await createAction(7, payload);
    expect(mock).toHaveBeenCalledWith(expect.stringContaining("/tickets/7/actions-taken"), expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify(payload), headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" } }));
  });
  it("patches only supplied changes under the correct parent", async () => {
    const mock = response(200, {});
    await updateAction(7, 4, { result: "Done", status: "COMPLETED", workflowRevision: 9 });
    expect(mock).toHaveBeenCalledWith(expect.stringContaining("/tickets/7/actions-taken/4"), expect.objectContaining({ method: "PATCH", body: JSON.stringify({ result: "Done", status: "COMPLETED", workflowRevision: 9 }) }));
  });
  it("preserves conflict status, code and explanation", async () => {
    response(409, { code: "STALE_REVISION", message: "Refresh before retrying." });
    await expect(updateAction(7, 4, { result: "Done", workflowRevision: 2 })).rejects.toMatchObject({ status: 409, code: "STALE_REVISION", message: "Refresh before retrying." });
  });
  it("distinguishes an empty directory from a failed lookup in strict mode", async () => {
    response(200, []);
    await expect(fetchStaffUsers({ strict: true })).resolves.toEqual([]);
    response(500, { message: "Directory unavailable" });
    await expect(fetchStaffUsers({ strict: true })).rejects.toMatchObject({ status: 500, message: "Unable to load eligible assignees." });
    await expect(fetchStaffUsers()).resolves.toEqual([]);
  });
  it("does not disguise a network failure as an empty directory", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    await expect(fetchStaffUsers({ strict: true })).rejects.toThrow("Network unavailable");
  });
});
