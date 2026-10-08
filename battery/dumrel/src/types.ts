import type { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import type {
	KnowledgeChange as CanonicalKnowledgeChange,
	ReadingKnowledge as CanonicalReadingKnowledge,
	SemanticRelations as CanonicalSemanticRelations,
	DirectSemanticRelation,
} from "./generated/types.js";

export type {
	ConjugationClass,
	DirectSemanticRelation,
	GermanValencyComplement,
	GovernedCase,
	LocutionType,
	MorphologicalTreeNode,
	ParticipleSource,
	PendingSemanticRelation,
	SemanticRelation,
	TranslationLanguage,
	UnitShadow,
	ValencyComplement,
	ValencySlot,
	ValencySlotStatus,
} from "./generated/types.js";

/** A Reading's governed complements in order; never empty. */
export type ValencyFrame = NonNullable<CanonicalReadingKnowledge["valency"]>;
/**
 * The Families a Semantic Relation from this Family may reach: Lexeme and
 * Locution share one relation space, and every other Family relates only
 * within itself (ADR 0039).
 */
type RelationFamily<F extends Dumling.Family> = F extends "Lexeme" | "Locution"
	? "Lexeme" | "Locution"
	: F;
type RelatedLemma<R extends Dumling.Reading> = Extract<
	Dumling.Lemma,
	{
		language: R["lemma"]["language"];
		family: RelationFamily<R["lemma"]["family"]>;
	}
>;
type RelatedReading<R extends Dumling.Reading> = Extract<
	Dumling.Reading,
	{
		lemma: {
			language: R["lemma"]["language"];
			family: RelationFamily<R["lemma"]["family"]>;
		};
	}
>;

type SourceTargets<R extends Dumling.Reading, Target> = Target extends {
	targetKind: "reading";
}
	? RelatedReading<R>[]
	: RelatedLemma<R>[];

/** An endonym names a PROPN Lemma: `Pressburg` stores `Bratislava`. */
type EndonymTargets<R extends Dumling.Reading> = Extract<
	RelatedLemma<R>,
	{ family: "Lexeme"; kind: "PROPN" }
>[];

// Distribute over canonical branches, preserving their keys and discriminants.
type SourceSemanticRelations<
	R extends Dumling.Reading,
	Relations = CanonicalSemanticRelations,
> = Relations extends unknown
	? {
			[Key in keyof Relations]: Key extends "endonym"
				? EndonymTargets<R>
				: Key extends DirectSemanticRelation
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

/**
 * What `parseReadingKnowledge` and `applyKnowledgeChange` answer: the Reading
 * Knowledge, fresh and checked against its Reading, or why it failed.
 */
export type KnowledgeParse<R extends Dumling.Reading = Dumling.Reading> =
	| { readonly success: true; readonly value: ReadingKnowledge<R> }
	| { readonly success: false; readonly error: ParsingError };

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
export type {
	KnowledgePolicyUnavailable,
	KnowledgeSelection,
} from "./select-knowledge.js";

export type ReadingWithKnowledge<R extends Dumling.Reading = Dumling.Reading> =
	{
		readonly reading: R;
		readonly knowledge: ReadingKnowledge<R>;
	};
