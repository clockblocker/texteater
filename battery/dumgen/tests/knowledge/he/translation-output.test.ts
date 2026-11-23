import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import { InvalidModelOutput } from "../../../src/errors.js";
import { translationsOf } from "../../../src/knowledge/he/translation-output.js";

for (const text of ["book", "книга"])
	test(`Hebrew translation output preserves the first structured equivalent: ${text}`, () => {
		const first: Dumrel.Translation = [{ kind: "Text", text }];
		expect(
			translationsOf(
				"translations",
				[first, [{ kind: "Slot", text }]],
				3,
			),
		).toEqual([first]);
	});

test("Hebrew equivalents retain governed pieces and relabel dangling prepositions", () => {
	const governed: Dumrel.Translation = [
		{ kind: "Text", text: "wait" },
		{ kind: "Preposition", text: "for" },
		{ kind: "Slot", text: "someone" },
	];
	expect(translationsOf("translations", [governed], 3)).toEqual([governed]);
	expect(
		translationsOf(
			"translations",
			[[{ kind: "Preposition", text: "чему-то" }]],
			3,
		),
	).toEqual([[{ kind: "Slot", text: "чему-то" }]]);
});

for (const output of [
	null,
	[],
	["book"],
	[[]],
	[[{ kind: "Text", text: " " }]],
	[[{ kind: "Unknown", text: "book" }]],
])
	test(`Hebrew structured translation rejects malformed output ${JSON.stringify(output)}`, () => {
		expect(translationsOf("translations", output, 3)).toBeInstanceOf(
			InvalidModelOutput,
		);
	});
