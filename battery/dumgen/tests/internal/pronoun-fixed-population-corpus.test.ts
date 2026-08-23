import { expect, test } from "bun:test";
import {
	allFixedLemmaCatalogs,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
} from "dumling/fixed";

import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";

test("German PRON corpus covers every exact fixed-population identity", () => {
	const catalog = allFixedLemmaCatalogs().find(
		({ scope }) =>
			scope === FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	);
	if (!catalog) throw new Error("Expected fixed German PRON population.");
	const covered = new Set(
		Object.values(corpus.cases).map(({ idealOutput }) =>
			identityKey(idealOutput.lemma),
		),
	);

	expect(catalog.members).toHaveLength(43);
	for (const lemma of catalog.members) {
		expect(covered.has(identityKey(lemma))).toBe(true);
	}
});

function identityKey(value: {
	readonly canonicalForm: string;
	readonly coreFeatures: object;
}): string {
	return JSON.stringify([value.canonicalForm, value.coreFeatures]);
}
