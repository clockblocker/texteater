import { describe, expect, test } from "bun:test";

import { parseSubmittedTextId } from "../src/lib/action-results";

describe("parseSubmittedTextId", () => {
	test("reads the compact accepted submission DTO", () => {
		expect(
			parseSubmittedTextId({ status: "Accepted", textId: "text_123" }),
		).toBe("text_123");
	});

	test("surfaces the compact rejected submission DTO", () => {
		expect(() =>
			parseSubmittedTextId({ status: "Rejected", message: "Too long." }),
		).toThrow("Too long.");
	});
});
