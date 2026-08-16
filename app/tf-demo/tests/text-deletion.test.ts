import { expect, test } from "bun:test";

import { readingKeyFor } from "../convex/model/linguisticKeys";
import { pruneReadingReferences } from "../server/textDeletion";

const bank = {
	lemma: {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	},
	emojiDescription: "🏦",
} as const;

const institute = {
	lemma: {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Institut",
		coreFeatures: { gender: "Neut", hyph: null },
	},
	emojiDescription: "🏢",
} as const;

test("text deletion removes inbound relations to a deleted Reading", () => {
	const knowledge = {
		definition: "A place.",
		semanticRelations: {
			synonym: [bank],
			hypernym: [institute],
		},
	};

	const result = pruneReadingReferences(
		knowledge,
		new Set([readingKeyFor(bank)]),
	);

	expect(result).toEqual({
		changed: true,
		value: {
			definition: "A place.",
			semanticRelations: { hypernym: [institute] },
		},
	});
	expect(knowledge.semanticRelations.synonym).toEqual([bank]);
});

test("text deletion leaves unrelated Reading Knowledge unchanged", () => {
	const knowledge = {
		semanticRelations: { hypernym: [institute] },
	};

	const result = pruneReadingReferences(
		knowledge,
		new Set([readingKeyFor(bank)]),
	);

	expect(result).toEqual({ changed: false, value: knowledge });
});
