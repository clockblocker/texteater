import { applyKnowledgeChange } from "../../src";
import type * as PublicTypes from "../../src/types";
import type {
	LemmaKnowledge,
	LexicalBreakdown,
	MorphemeReadingReference,
	MorphologicalTree,
	ReadingKnowledge,
} from "../../src/types";
import {
	constructionReading,
	morphemeReading,
	nounReading,
	nounShadow,
	phrasemeReading,
	verbShadow,
} from "./fixtures";

// @ts-expect-error The owner-ambiguous Knowledge union is intentionally absent.
type RemovedKnowledge = PublicTypes.Knowledge;
// @ts-expect-error The lexical compatibility alias is intentionally absent.
type RemovedLexicalRelation = PublicTypes.LexicalRelation;
// @ts-expect-error Flat morphological relations are intentionally absent.
type RemovedMorphologicalRelation = PublicTypes.MorphologicalRelation;
// @ts-expect-error Contribution aggregates were replaced by KnowledgeChange.
type RemovedContribution = PublicTypes.ReadingKnowledgeContribution;
// @ts-expect-error Translation objects were replaced by language buckets.
type RemovedTranslation = PublicTypes.Translation;

const lemmaKnowledge: LemmaKnowledge<"de" | "en"> = {
	transcriptions: { de: ["Haus"], en: ["house"] },
};
const readingKnowledge: ReadingKnowledge<"en"> = {
	definition: "building",
	translations: { en: ["house"] },
};
const morphemeReference: MorphemeReadingReference = morphemeReading;
const tree: MorphologicalTree = {
	root: {
		nodeKind: "structure",
		children: [
			{ nodeKind: "morphemeReading", reading: morphemeReference },
			{ nodeKind: "unitShadow", unitShadow: nounShadow },
		],
	},
};
const breakdown: LexicalBreakdown = [nounShadow, verbShadow];

void [lemmaKnowledge, readingKnowledge, tree, breakdown];

const missingLanguageBucket: LemmaKnowledge<"de" | "en"> = {
	// @ts-expect-error A union Target Language requires every named bucket.
	transcriptions: { de: ["Haus"] },
};
void missingLanguageBucket;

const invalidTree: MorphologicalTree = {
	root: {
		nodeKind: "structure",
		children: [
			// @ts-expect-error Lexeme Readings cannot occupy Morpheme Reading leaves.
			{ nodeKind: "morphemeReading", reading: nounReading },
		],
	},
};
void invalidTree;

const invalidPhrasemeTree: MorphologicalTree = {
	root: {
		nodeKind: "structure",
		children: [
			// @ts-expect-error Phraseme Readings cannot occupy Morpheme Reading leaves.
			{ nodeKind: "morphemeReading", reading: phrasemeReading },
		],
	},
};
void invalidPhrasemeTree;

const invalidConstructionTree: MorphologicalTree = {
	root: {
		nodeKind: "structure",
		children: [
			// @ts-expect-error Construction Readings cannot occupy Morpheme Reading leaves.
			{ nodeKind: "morphemeReading", reading: constructionReading },
		],
	},
};
void invalidConstructionTree;

const germanLemmaKnowledge: LemmaKnowledge<"de"> = {
	transcriptions: { de: ["Haus"] },
};
const bilingualLemmaKnowledge = applyKnowledgeChange(germanLemmaKnowledge, {
	kind: "Contribute",
	aspect: "transcriptions",
	language: "en",
	value: ["house"],
});
bilingualLemmaKnowledge.transcriptions?.de satisfies
	| [string, ...string[]]
	| undefined;
bilingualLemmaKnowledge.transcriptions?.en satisfies
	| [string, ...string[]]
	| undefined;
// @ts-expect-error No unaddressed Target Language key was introduced.
bilingualLemmaKnowledge.transcriptions?.fr;

const englishLemmaKnowledge = applyKnowledgeChange(bilingualLemmaKnowledge, {
	kind: "Retract",
	aspect: "transcriptions",
	language: "de",
});
englishLemmaKnowledge.transcriptions?.en satisfies
	| [string, ...string[]]
	| undefined;
// @ts-expect-error Retract removes the addressed Target Language key.
englishLemmaKnowledge.transcriptions?.de;

const germanReadingKnowledge: ReadingKnowledge<"de"> = {
	translations: { de: ["Haus"] },
};
const bilingualReadingKnowledge = applyKnowledgeChange(germanReadingKnowledge, {
	kind: "Correct",
	aspect: "translations",
	language: "en",
	value: ["house"],
});
bilingualReadingKnowledge.translations?.de satisfies
	| [string, ...string[]]
	| undefined;
bilingualReadingKnowledge.translations?.en satisfies
	| [string, ...string[]]
	| undefined;

const englishReadingKnowledge = applyKnowledgeChange(
	bilingualReadingKnowledge,
	{
		kind: "Retract",
		aspect: "translations",
		language: "de",
	},
);
englishReadingKnowledge.translations?.en satisfies
	| [string, ...string[]]
	| undefined;
// @ts-expect-error Retract removes the addressed Target Language key.
englishReadingKnowledge.translations?.de;

void [
	undefined as unknown as RemovedKnowledge,
	undefined as unknown as RemovedLexicalRelation,
	undefined as unknown as RemovedMorphologicalRelation,
	undefined as unknown as RemovedContribution,
	undefined as unknown as RemovedTranslation,
];
