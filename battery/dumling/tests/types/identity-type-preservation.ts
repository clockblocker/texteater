import type { PrettifyDeep } from "../../src/types/core/helpers.js";
import type { Lemma, SegmentedSentenceId, Selection } from "../../src/types.js";

type Assert<T extends true> = T;
type Equal<Left, Right> =
	(<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
		? true
		: false;

type _SegmentedSentenceIdBrandIsPreserved = Assert<
	Equal<PrettifyDeep<SegmentedSentenceId>, SegmentedSentenceId>
>;

type DeNounLemma = Extract<Lemma<"de">, { family: "Lexeme"; kind: "NOUN" }>;
type _LemmaIsStructural = Assert<
	Equal<
		keyof DeNounLemma,
		"language" | "canonicalForm" | "family" | "kind" | "coreFeatures"
	>
>;

type DeSelection = Selection<"de">;
type _ConcreteSelectionSentenceIdIsBranded = Assert<
	Equal<DeSelection["segmentedSentenceId"], SegmentedSentenceId>
>;
