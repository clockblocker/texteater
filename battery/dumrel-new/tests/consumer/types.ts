import type * as Dumling from "dumling/types";
import { applyKnowledgeChange, parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";

export type Definition = Dumrel.ReadingKnowledge["definition"];
export const parse = parseReadingKnowledge;

type NounReading = Dumling.Reading<"de", "Lexeme", "NOUN">;
declare const source: NounReading;
const parsed = parseReadingKnowledge({ source, knowledge: {} });
const changed = applyKnowledgeChange({
	source,
	knowledge: {},
	change: { kind: "Retract", aspect: "definition" },
});

type ParsedKnowledge = Extract<typeof parsed, { success: true }>["value"];
type ChangedKnowledge = Extract<typeof changed, { success: true }>["value"];
type LemmaTargets<K extends Dumrel.ReadingKnowledge> = NonNullable<
	Extract<
		NonNullable<K["semanticRelations"]>,
		{ targetKind?: "lemma" }
	>["synonym"]
>[number];
export type ParsedTargetFamily = LemmaTargets<ParsedKnowledge>["family"];
export type ChangedTargetFamily = LemmaTargets<ChangedKnowledge>["family"];
export type RelatedProperNoun = Extract<
	LemmaTargets<ParsedKnowledge>,
	{ kind: "PROPN" }
>;

type MorphemeReading = Extract<
	Dumrel.MorphologicalTreeNode,
	{ nodeKind: "morphemeReading" }
>["reading"];
export type PrefixReading = Extract<
	MorphemeReading,
	{ lemma: { language: "de"; kind: "Prefix" } }
>;
export type PrefixCoordinates = Pick<
	PrefixReading["lemma"],
	"language" | "family" | "kind"
>;
export type PrefixFeature =
	PrefixReading["lemma"]["coreFeatures"]["hasSepPrefix"];
export type MorphemeReadingCompatible = MorphemeReading extends Dumling.Reading
	? true
	: false;
type SuffixReading = Extract<
	MorphemeReading,
	{ lemma: { language: "de"; kind: "Suffix" } }
>;
// @ts-expect-error An empty Feature Bag is an object, never a primitive.
const invalidSuffixCore: SuffixReading["lemma"]["coreFeatures"] = 123;
export type BreakdownFamily = Dumrel.LexicalBreakdown[number]["family"];
export type RetractSynonym = Extract<
	Dumrel.KnowledgeChange<NounReading>,
	{
		kind: "Retract";
		aspect: "semanticRelations";
		targetKind?: "lemma";
	}
>;
export type RetractionCarriesValue =
	Extract<RetractSynonym, { value: unknown }> extends never ? false : true;

// @ts-expect-error Recursive leaves contain actual Morpheme Readings.
const invalidReading: MorphemeReading = 123;
// @ts-expect-error A Lexeme Reading is not a Morpheme Reading.
const invalidReadingFamily: MorphemeReading = source;
const prefixShadow = {
	language: "de",
	family: "Morpheme",
	kind: "Prefix",
	canonicalForm: "un-",
} as const;
declare const morphemeBreakdown: [typeof prefixShadow, typeof prefixShadow];
// @ts-expect-error Lexical Breakdown admits only Lexeme shadows.
const invalidBreakdown: Dumrel.LexicalBreakdown = morphemeBreakdown;
const invalidRetract: Dumrel.KnowledgeChange<NounReading> = {
	kind: "Retract",
	aspect: "semanticRelations",
	relation: "synonym",
	// @ts-expect-error Retract removes a bucket and carries no value.
	value: [],
};

declare const prefixLemma: Dumling.Lemma<"de", "Morpheme", "Prefix">;
const invalidTarget: Dumrel.KnowledgeChange<NounReading> = {
	kind: "Contribute",
	aspect: "semanticRelations",
	relation: "synonym",
	// @ts-expect-error Semantic targets must share the source Family.
	value: [prefixLemma],
};

const validRetract: Dumrel.KnowledgeChange<NounReading> = {
	kind: "Retract",
	aspect: "semanticRelations",
	relation: "synonym",
};
const validBreakdown: Dumrel.LexicalBreakdown = [
	{ language: "de", family: "Lexeme", kind: "NOUN", canonicalForm: "Haus" },
	{ language: "de", family: "Lexeme", kind: "VERB", canonicalForm: "bauen" },
];
void [
	invalidSuffixCore,
	invalidReading,
	invalidReadingFamily,
	invalidBreakdown,
	invalidRetract,
	invalidTarget,
	validRetract,
	validBreakdown,
];
