import { applyKnowledgeChange } from "../../src";
import type * as PublicTypes from "../../src/types";
import type {
	KnowledgeRequestMask,
	KnowledgeSettings,
	LemmaReference,
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
// @ts-expect-error Translation objects were replaced by language buckets.
type RemovedTranslation = PublicTypes.Translation;

const readingKnowledge: ReadingKnowledge<"en"> = {
	transcription: "haʊs",
	definition: "building",
	translations: { en: ["house"] },
};
const targetLemma: LemmaReference = nounReading.lemma;
readingKnowledge.semanticRelations = { synonym: [targetLemma] };
// @ts-expect-error Semantic Relation targets are Lemmas, not Readings.
readingKnowledge.semanticRelations = { synonym: [nounReading] };
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

const settings: KnowledgeSettings = {
	transcription: true,
	definition: true,
	translations: { en: true },
	morphologicalTree: true,
	lexicalBreakdown: true,
	semanticRelations: {
		synonym: true,
		nearSynonym: true,
		antonym: true,
		nearAntonym: true,
		hypernym: true,
		hyponym: true,
		meronym: true,
		holonym: true,
	},
};
const requestMask: KnowledgeRequestMask = {
	transcription: null,
	translations: { en: null },
	semanticRelations: { synonym: null },
};
const nearAntonymRelation: PublicTypes.SemanticRelation = "nearAntonym";
const directRelation: PublicTypes.DirectSemanticRelation = "holonym";
// @ts-expect-error Hyponym is an inferred view, not a durable direct kind.
const invalidDirectRelation: PublicTypes.DirectSemanticRelation = "hyponym";
// @ts-expect-error Unknown relation kinds remain outside the public vocabulary.
const invalidSemanticRelation: PublicTypes.SemanticRelation = "related";

// @ts-expect-error Settings are global, not Family/Kind-specific.
const familySpecificSettings: KnowledgeSettings = { Lexeme: {} };
const invalidRequestLeaf: KnowledgeRequestMask = {
	// @ts-expect-error Selected request leaves are null, not booleans.
	transcription: true,
};
const invalidTranslationRequest: KnowledgeRequestMask = {
	translations: {
		// @ts-expect-error English is the only configured Translation leaf.
		de: null,
	},
};
const incompleteSettings: KnowledgeSettings = {
	...settings,
	// @ts-expect-error Every Semantic Relation setting is required.
	semanticRelations: { synonym: true },
};

void [
	readingKnowledge,
	targetLemma,
	tree,
	breakdown,
	settings,
	requestMask,
	nearAntonymRelation,
	directRelation,
	invalidDirectRelation,
	invalidSemanticRelation,
	familySpecificSettings,
	invalidRequestLeaf,
	invalidTranslationRequest,
	incompleteSettings,
];

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

// @ts-expect-error Lemma Knowledge was removed; Knowledge is Reading-only.
type RemovedLemmaKnowledge = PublicTypes.LemmaKnowledge;

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
	undefined as unknown as RemovedTranslation,
	undefined as unknown as RemovedLemmaKnowledge,
];
