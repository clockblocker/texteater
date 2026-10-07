import { expect, test } from "bun:test";
import { isRecord } from "../src/index.js";

test("isRecord accepts plain objects and other non-array objects", () => {
	expect(isRecord({})).toBe(true);
	expect(isRecord({ kind: "Text" })).toBe(true);
	expect(isRecord(Object.create(null))).toBe(true);
	expect(isRecord(new Date(0))).toBe(true);
});

test("isRecord rejects null, arrays and primitives", () => {
	expect(isRecord(null)).toBe(false);
	expect(isRecord(undefined)).toBe(false);
	expect(isRecord([])).toBe(false);
	expect(isRecord([{ kind: "Text" }])).toBe(false);
	expect(isRecord("text")).toBe(false);
	expect(isRecord(1)).toBe(false);
});
