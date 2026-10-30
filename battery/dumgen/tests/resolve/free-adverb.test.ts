import { expect, test } from "bun:test";
import type { Segment } from "../../src/segment/segmented-sentence.js";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	space,
	stop,
	unitOf,
	word,
	writes,
} from "./support.js";

// A free pronominal adverb fills its governor's slot with no member
// (Rule de/pronominal-adverb-stands-alone, ADR 0034).

const sentence = (...words: readonly string[]): Segment[] => [
	...words.flatMap((text, index) =>
		index === 0 ? [word(text)] : [space, word(text)],
	),
	stop,
];

test("a free pronominal adverb the head governs is its preposition's evidence with no member", async () => {
	const jev = fakeJev({
		freeGoverned_s4: "Governed",
		freeGovernedCase_s4: "Acc",
	});
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("warten").ask },
		{
			sentence: sentenceOf("", sentence("Er", "wartet", "darauf")),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(attested(result)).toHaveProperty("valencyEvidence", [
		{
			member: null,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "auf",
					coreFeatures: {},
				},
				governedCase: "Acc",
				referent: "Something",
			},
			realizedCase: "Acc",
		},
	]);
});

test("only a pronominal adverb in the head's clause is asked, and a free one records nothing", async () => {
	const jev = fakeJev({ freeGoverned_s2: "Free" });
	const segments: Segment[] = [
		word("Er"),
		space,
		word("dabei"),
		{ kind: "Punctuation", text: "," },
		space,
		word("sie"),
		space,
		word("wartet"),
		stop,
	];
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("warten").ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([7], "Lexeme/VERB"),
		},
	);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).not.toContain(
		"freeGoverned_s2",
	);
	expect(attested(result)).toHaveProperty("valencyEvidence", []);
});
