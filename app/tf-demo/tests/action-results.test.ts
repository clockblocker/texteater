import { describe, expect, test } from "bun:test";

import {
	parseResolvedReadingId,
	parseSubmittedTextId,
} from "../src/lib/action-results";

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

describe("parseResolvedReadingId", () => {
	for (const status of ["Committed", "Reused", "Resolved"] as const) {
		test(`reads the canonical Reading ID from ${status} results`, () => {
			expect(
				parseResolvedReadingId({
					grammatical: { decision: "Resolved" },
					persisted: { status, readingId: "reading_123" },
				}),
			).toBe("reading_123");
		});
	}

	test("does not navigate for unresolved or conflicting results", () => {
		expect(
			parseResolvedReadingId({
				grammatical: { decision: "Unresolved" },
				persisted: { status: "Unresolved" },
			}),
		).toBeNull();
		expect(
			parseResolvedReadingId({
				grammatical: { decision: "Resolved" },
				persisted: { status: "MembershipConflict" },
			}),
		).toBeNull();
		expect(
			parseResolvedReadingId({
				grammatical: { decision: "Resolved" },
				persisted: { status: "DictionaryConflict" },
			}),
		).toBeNull();
	});
});
