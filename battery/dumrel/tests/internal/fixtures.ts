import { dumling } from "dumling";
import type { MorphologicalTree } from "../../src/types";

export const nounReading = {
	lemma: dumling.de.create.lemma({
		canonicalForm: "Haus",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Neut", hyph: null },
	}),
	emojiDescription: "🏠",
};

export const secondNounReading = {
	lemma: dumling.de.create.lemma({
		canonicalForm: "Gebäude",
		family: "Lexeme",
		kind: "NOUN",
		coreFeatures: { gender: "Neut", hyph: null },
	}),
	emojiDescription: "🏢",
};

export const morphemeReading = {
	lemma: dumling.de.create.lemma({
		canonicalForm: "ab",
		family: "Morpheme",
		kind: "Prefix",
		coreFeatures: { hasSepPrefix: null },
	}),
	emojiDescription: "🧩",
};

export const phrasemeReading = {
	lemma: dumling.de.create.lemma({
		canonicalForm: "auf jeden Fall",
		family: "Phraseme",
		kind: "DiscourseFormula",
		coreFeatures: { discourseFormulaRole: "Reaction" },
	}),
	emojiDescription: "💬",
};

export const constructionReading = {
	lemma: dumling.de.create.lemma({
		canonicalForm: "zum",
		family: "Construction",
		kind: "Fusion",
		coreFeatures: {},
	}),
	emojiDescription: "🔗",
};

export const nounShadow = {
	language: "de" as const,
	canonicalForm: "Haus",
	family: "Lexeme" as const,
	kind: "NOUN" as const,
};

export const verbShadow = {
	language: "de" as const,
	canonicalForm: "bauen",
	family: "Lexeme" as const,
	kind: "VERB" as const,
};

export const morphologicalTree: MorphologicalTree = {
	root: {
		nodeKind: "structure" as const,
		children: [
			{ nodeKind: "morphemeReading" as const, reading: morphemeReading },
			{ nodeKind: "unitShadow" as const, unitShadow: nounShadow },
		],
	},
};
