import { describe, expect, it } from "vitest";
import { ActionStatus } from "@prisma/client";
import { actionId, workflowRevision, isActionTransition, validateActionCreate, validateActionChanges } from "../../src/utils/actionValidation.js";

const planned = { status: ActionStatus.PLANNED, result: null, followUpRequired: false, followUpNote: null };

describe("Issue 20 Action validation and state machine (D-01/D-05/D-06/D-10)", () => {
  it.each([undefined, null, true, false, "0", "1", "", [], [1], {}, -1, 0.5, NaN, Infinity, 2147483648])("rejects invalid revision type/range: %j", value => {
    expect(workflowRevision(value)).toBeNull();
  });
  it("accepts numeric revisions and only positive numeric IDs", () => {
    expect(workflowRevision(0)).toBe(0);
    expect(workflowRevision(17)).toBe(17);
    expect(actionId(1)).toBe(1);
    for (const value of [null, undefined, true, "1", [1], 0, -1, 1.2, Infinity, 2147483648]) expect(actionId(value)).toBeNull();
  });
  it.each(Object.values(ActionStatus).flatMap(from => Object.values(ActionStatus).map(to => ({ from, to }))))("validates $from -> $to", ({ from, to }) => {
    const valid = from === "PLANNED" && to !== "PLANNED";
    expect(isActionTransition(from, to)).toBe(valid);
    const run = () => validateActionChanges({ ...planned, status: from, result: "Existing" }, { status: to, result: "Done" });
    if (valid) expect(run()).toMatchObject({ status: to, result: "Done" });
    else expect(run).toThrow("Only PLANNED Actions");
  });
  it("normalizes creation fields and ignores client-owned identity claims", () => {
    expect(validateActionCreate({ description: " Inspect ", result: " Finding ", performedById: 999, createdAt: "forged", status: "COMPLETED" })).toEqual({
      description: "Inspect", result: "Finding", assignedToId: null, attachmentNotes: null, followUpRequired: false, followUpNote: null,
    });
  });
  it.each(["description", "result", "followUpNote", "attachmentNotes"])("enforces %s bounds on create and edit", name => {
    const max = name === "description" || name === "result" ? 2000 : 1000;
    for (const length of [max - 1, max]) {
      const value = "x".repeat(length);
      expect(validateActionCreate({ description: "Inspect", [name]: value })).toHaveProperty(name, value);
      expect(validateActionChanges(planned, { [name]: value })).toHaveProperty(name, value);
    }
    for (const value of ["x".repeat(max + 1), false, [], {}, 12, null]) {
      expect(() => validateActionCreate({ description: "Inspect", [name]: value })).toThrow(name);
      expect(() => validateActionChanges(planned, { [name]: value })).toThrow(name);
    }
  });
  it("requires nonblank description and conditional notes", () => {
    for (const description of [undefined, "", " \t\n "]) expect(() => validateActionCreate({ description })).toThrow("description");
    for (const followUpNote of [undefined, "", " \t "]) {
      expect(() => validateActionCreate({ description: "Inspect", followUpRequired: true, followUpNote })).toThrow("followUpNote");
      expect(() => validateActionChanges(planned, { followUpRequired: true, followUpNote })).toThrow("followUpNote");
    }
    expect(validateActionChanges({ ...planned, followUpRequired: true, followUpNote: "Required" }, { followUpRequired: false, followUpNote: "" })).toEqual({ followUpRequired: false, followUpNote: null });
  });
  it.each(["COMPLETED", "CANCELLED"] as const)("requires result when transitioning to %s", status => {
    for (const result of [undefined, "", " \n "]) expect(() => validateActionChanges(planned, { status, result })).toThrow("result");
  });
  it("validates completed correction final state and immutable fields", () => {
    const completed = { ...planned, status: ActionStatus.COMPLETED, result: "Done" };
    expect(() => validateActionChanges(completed, { result: " " })).toThrow("result");
    expect(validateActionChanges(completed, { result: "Corrected", attachmentNotes: "Evidence" })).toEqual({ result: "Corrected", attachmentNotes: "Evidence" });
    for (const field of ["description", "assignedToId"]) expect(() => validateActionChanges(completed, { [field]: field === "description" ? "changed" : 1 })).toThrow("corrections");
    for (const field of ["performedById", "actorId", "ticketId", "createdAt", "updatedAt", "id"]) expect(() => validateActionChanges(planned, { [field]: 1 })).toThrow("unsupported fields");
    expect(() => validateActionChanges({ ...completed, status: ActionStatus.CANCELLED }, { result: "Changed" })).toThrow("Cancelled");
  });
});
