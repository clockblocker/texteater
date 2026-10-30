import { expect, test } from "bun:test";
import { InvalidModelOutput } from "../../src/errors.js";
import { translationsOf } from "../../src/knowledge/de/translation-output.js";

test("a Preposition with no Slot right after it is read as a Slot (ADR 0055)", () => {
	expect(
		translationsOf(
			"translations",
			[
				[
					{ kind: "Text", text: "радоваться" },
					{ kind: "Preposition", text: "чему-то" },
				],
				[
					{ kind: "Text", text: "ждать" },
					{ kind: "Preposition", text: "кого-то" },
					{ kind: "Text", text: "долго" },
				],
				[
					{ kind: "Text", text: "иметь отношение" },
					{ kind: "Preposition", text: "к" },
					{ kind: "Slot", text: "чему-то" },
				],
			],
			3,
		),
	).toEqual([
		[
			{ kind: "Text", text: "радоваться" },
			{ kind: "Slot", text: "чему-то" },
		],
		[
			{ kind: "Text", text: "ждать" },
			{ kind: "Slot", text: "кого-то" },
			{ kind: "Text", text: "долго" },
		],
		[
			{ kind: "Text", text: "иметь отношение" },
			{ kind: "Preposition", text: "к" },
			{ kind: "Slot", text: "чему-то" },
		],
	]);
});

test("an answer that is no list of pieces is unusable", () => {
	expect(translationsOf("translations", [["bouquet"]], 3)).toBeInstanceOf(
		InvalidModelOutput,
	);
	expect(
		translationsOf("translations", [[{ kind: "Text", text: " " }]], 3),
	).toBeInstanceOf(InvalidModelOutput);
});
