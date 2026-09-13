import type * as Dumling from "dumling/types";
import type {
	KnowledgeChange as CanonicalKnowledgeChange,
	ReadingKnowledge as CanonicalReadingKnowledge,
	SemanticRelations as CanonicalSemanticRelations,
	DirectSemanticRelation,
	MorphologicalTree,
} from "./generated/types.js";

export type {
	DirectSemanticRelation,
	LexicalBreakdown,
	MorphologicalTree,
	PendingSemanticRelation,
	TranslationLanguage,
	UnitShadow,
} from "./generated/types.js";

export type MorphologicalTreeStructure = MorphologicalTree["root"];
export type MorphologicalTreeNode =
	MorphologicalTreeStructure["children"][number];
export type NonEmptyStrings = [string, ...string[]];
export type RelatedLemma<R extends Dumling.Reading> = Extract<
	Dumling.Lemma,
	{ language: R["lemma"]["language"]; family: R["lemma"]["family"] }
>;
export type RelatedReading<R extends Dumling.Reading> = Extract<
	Dumling.Reading,
	{
		lemma: {
			language: R["lemma"]["language"];
			family: R["lemma"]["family"];
		};
	}
>;

type SourceTargets<R extends Dumling.Reading, Target> = Target extends {
	targetKind: "reading";
}
	? RelatedReading<R>[]
	: RelatedLemma<R>[];

// Distribute over canonical branches, preserving their keys and discriminants.
type SourceSemanticRelations<
	R extends Dumling.Reading,
	Relations = CanonicalSemanticRelations,
> = Relations extends unknown
	? {
			[Key in keyof Relations]: Key extends DirectSemanticRelation
				? SourceTargets<R, Relations>
				: Relations[Key];
		}
	: never;

export type SemanticRelations<R extends Dumling.Reading = Dumling.Reading> = [
	Dumling.Reading,
] extends [R]
	? CanonicalSemanticRelations
	: SourceSemanticRelations<R>;

export type ReadingKnowledge<R extends Dumling.Reading = Dumling.Reading> = [
	Dumling.Reading,
] extends [R]
	? CanonicalReadingKnowledge
	: Omit<CanonicalReadingKnowledge, "semanticRelations"> & {
			semanticRelations?: SourceSemanticRelations<R>;
		};

type SourceKnowledgeChange<
	R extends Dumling.Reading,
	Change = CanonicalKnowledgeChange,
> = Change extends { aspect: "semanticRelations"; value: unknown }
	? {
			[Key in keyof Change]: Key extends "value"
				? SourceTargets<R, Change>
				: Change[Key];
		}
	: Change;

export type KnowledgeChange<R extends Dumling.Reading = Dumling.Reading> = [
	Dumling.Reading,
] extends [R]
	? CanonicalKnowledgeChange
	: SourceKnowledgeChange<R>;

export type {
	KnowledgeRequestMask,
	KnowledgeSelectionInput,
	KnowledgeSettings,
} from "./generated/types.js";
