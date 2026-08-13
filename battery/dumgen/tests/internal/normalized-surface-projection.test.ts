import { describe, expect, test } from "bun:test";

import {
	constructNormalizedSurface,
	NormalizedSurfaceProjectionError,
	projectGrammaticalResolutionInput,
} from "../../src/schema/normalized-surface-projection";

describe("normalized Surface projection", () => {
	test("projects members from Segment indices rather than reparsing escaped markup", () => {
		const input = projectGrammaticalResolutionInput({
			segments: [
				{ text: "sage", kind: "ResolvableText" },
				{ text: " ", kind: "Whitespace" },
				{ text: "<TARGET>", kind: "OpaqueText" },
				{ text: " ", kind: "Whitespace" },
				{ text: "auf&", kind: "ResolvableText" },
			],
			memberSegmentIndices: [0, 4],
		});

		expect(input).toEqual({
			markedContext:
				"<TARGET>sage</TARGET> &lt;TARGET&gt; <TARGET>auf&amp;</TARGET>",
			members: ["sage", "auf&"],
		});
		expect(Object.isFrozen(input.members)).toBe(true);
	});

	test("constructs one scalar from repeated positionally aligned members", () => {
		expect(
			constructNormalizedSurface({
				attestedMembers: ["Pass", "auf", "auf"],
				normalizedMembers: ["pass", "auf", "auf"],
				memberOrthographies: ["Standard", "Standard", "Standard"],
			}),
		).toBe("pass auf auf");
	});

	test("retains licensed variants and Unicode-equivalent German casing", () => {
		expect(
			constructNormalizedSurface({
				attestedMembers: ["Photographie", "U\u0308bung"],
				normalizedMembers: ["Photographie", "übung"],
				memberOrthographies: ["Standard", "Standard"],
			}),
		).toBe("Photographie übung");
	});

	test("accepts prompt-owned typo repair without inventing an edit policy", () => {
		expect(
			constructNormalizedSurface({
				attestedMembers: ["Bnak"],
				normalizedMembers: ["Bank"],
				memberOrthographies: ["Typo"],
			}),
		).toBe("Bank");
	});

	test.each([
		["reordered", ["auf", "pass", "auf"]],
		["unrelated", ["pass", "banana", "auf"]],
		["leading whitespace", [" pass", "auf", "auf"]],
		["trailing whitespace", ["pass ", "auf", "auf"]],
		["repeated whitespace", ["pass", "auf  auf", "auf"]],
		["multiple source members in one position", ["pass auf", "auf", "auf"]],
	] as const)(
		"rejects %s normalized members",
		(_label, normalizedMembers) => {
			expect(() =>
				constructNormalizedSurface({
					attestedMembers: ["Pass", "auf", "auf"],
					normalizedMembers,
					memberOrthographies: ["Standard", "Standard", "Standard"],
				}),
			).toThrow(NormalizedSurfaceProjectionError);
		},
	);

	test("rejects cardinality mismatch", () => {
		expect(() =>
			constructNormalizedSurface({
				attestedMembers: ["wartet", "auf"],
				normalizedMembers: ["wartet"],
				memberOrthographies: ["Standard", "Standard"],
			}),
		).toThrow(NormalizedSurfaceProjectionError);
	});
});
