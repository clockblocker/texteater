import { expect, test } from "bun:test";
import {
	attestedGovernment,
	uncoveredGovernment,
} from "../server/attestedGovernment";
import type { StoredSentenceAnalysis } from "../server/sentenceAnalysisStorage";

// Er0 ist3 abhängig7 vo16 m18 Wetter20 .26 — `vom` is one stored Segment, two analysed ones.
const stitchedText = "Er ist abhängig vom Wetter.";
const stored = {
	stitchedText,
	segments: [
		"Er",
		" ",
		"ist",
		" ",
		"abhängig",
		" ",
		"vom",
		" ",
		"Wetter",
		".",
	].map((text, index) => ({ index, text })),
};
const piece = (offset: number, text: string, surface = text) => ({
	offset,
	kind: /^\s+$/u.test(text)
		? ("Whitespace" as const)
		: ("ResolvableText" as const),
	text,
	surface,
});
const word = (id: string, offset: number) => ({
	id,
	members: [{ offset, role: "Head" as const }],
	routeMass: [{ key: "X", share: 1 }],
	identity: null,
	provenance: "vote",
});
const analysis: StoredSentenceAnalysis = {
	sentenceId: "abhaengig",
	language: "de",
	stitchedText,
	segments: [
		piece(0, "Er"),
		piece(2, " "),
		piece(3, "ist"),
		piece(6, " "),
		piece(7, "abhängig"),
		piece(15, " "),
		piece(16, "vo", "von"),
		piece(18, "m", "dem"),
		piece(19, " "),
		piece(20, "Wetter"),
	],
	targets: [
		word("t1", 0),
		word("t2", 3),
		word("t3", 7),
		word("t4", 16),
		{
			...word("t5", 20),
			members: [
				{ offset: 18, role: "Article" },
				{ offset: 20, role: "Head" },
			],
		},
	],
	phrasemes: [],
	fusions: [],
	government: [
		{ offset: 16, preposition: "von", case: "Dat", governor: "t3" },
	],
};

test("an occurrence attests the government of the words inside it, bridged through the Stitched Text", () => {
	expect(attestedGovernment(analysis, stored, [4])).toEqual([
		{ preposition: "von", case: "Dat" },
	]);
	expect(attestedGovernment(analysis, stored, [2])).toEqual([]);
	// The preposition's own word is not its governor.
	expect(attestedGovernment(analysis, stored, [6])).toEqual([]);
});

test("a stale or pre-government analysis attests nothing", () => {
	expect(attestedGovernment(null, stored, [4])).toEqual([]);
	const { government: _government, ...old } = analysis;
	expect(attestedGovernment(old, stored, [4])).toEqual([]);
	expect(
		attestedGovernment(
			analysis,
			{ ...stored, stitchedText: "Er ist abhängig vom Regen." },
			[4],
		),
	).toEqual([]);
});

test("a Preposition Slot covers the same preposition and case only", () => {
	const knowledge = {
		valency: [
			{
				status: "Required",
				complement: { kind: "Case", case: "Dat", referent: "Someone" },
			},
			{
				status: "Optional",
				complement: {
					kind: "Preposition",
					preposition: { canonicalForm: "von" },
					case: "Dat",
					referent: "Either",
				},
			},
		],
	};
	expect(
		uncoveredGovernment(
			[
				{ preposition: "von", case: "Dat" },
				{ preposition: "auf", case: "Acc" },
			],
			knowledge,
		),
	).toEqual([{ preposition: "auf", case: "Acc" }]);
	expect(
		uncoveredGovernment([{ preposition: "von", case: "Dat" }], {}),
	).toEqual([{ preposition: "von", case: "Dat" }]);
});
