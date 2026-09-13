import { describe, expect, test } from "bun:test";

import { projectGrammaticalResolutionInput } from "../../src/schema/normalized-surface-projection";

describe("Grammatical Resolution input projection", () => {
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
});
