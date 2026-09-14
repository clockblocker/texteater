import { expect, test } from "bun:test";
import { required } from "../src/index.js";

test("required preserves present falsy values", () => {
	expect(required(false)).toBe(false);
	expect(required(0)).toBe(0);
	expect(required("")).toBe("");
	expect(required(null)).toBeNull();
});

test("required rejects undefined with the caller's message", () => {
	expect(() => required(undefined, "Missing fixture")).toThrow(
		"Missing fixture",
	);
});
