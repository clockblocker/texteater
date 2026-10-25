import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import type { BreakdownInput } from "../../../src/segment/breakdown.js";
import { germanConstituents } from "../../../src/segment/de/breakdown/constituents.js";
import { germanMorphemes } from "../../../src/segment/de/breakdown/morphemes.js";
import { input, judgeWanting, shown } from "./breakdown-support.js";

// A lexically reflexive Lexeme breaks down as its word: the reflexive is a
// satellite (system ADR 0050, #1241). Neither verb is a Breakdown Record.

const reflexive = (
	canonicalForm: string,
	hasSepPrefix: string | null,
): BreakdownInput => {
	const { reading } = input("Lexeme", "VERB", canonicalForm, "🤝");
	return {
		reading: {
			...reading,
			lemma: {
				...reading.lemma,
				coreFeatures: { hasSepPrefix, lexicallyReflexive: "Acc" },
			},
		} as BreakdownInput["reading"],
	};
};

test("a lexically reflexive particle verb's Constituents are its word's, its particle first", async () => {
	const judge = judgeWanting("an- (prefix) + schließen", "schließen");
	const result = await Effect.runPromise(
		germanConstituents(reflexive("sich anschließen", "an"), judge.ask),
	);
	expect(result.kind === "Constituents" && shown(result.pieces)).toEqual([
		"an→Morpheme/Prefix:an-",
		"schließen→Lexeme/VERB:schließen",
	]);
	// The judge reads the word, not the reflexive.
	const [first] = judge.requests();
	expect(first?.state.word).toBe("anschließen");
});

test("a lexically reflexive bottom word's morphemes are its word's", async () => {
	const pieces = await Effect.runPromise(
		germanMorphemes(reflexive("sich schämen", null), judgeWanting().ask),
	);
	expect(shown(pieces)).toEqual([
		"schäm→Morpheme/Root:schäm",
		"en→Morpheme/Ending:-en",
	]);
});
