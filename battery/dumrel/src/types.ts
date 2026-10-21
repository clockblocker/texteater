import type { ParsingError } from "common-utils/validation";
import type * as Dumling from "dumling/types";
import type {
	KnowledgeChange as CanonicalKnowledgeChange,
	ReadingKnowledge as CanonicalReadingKnowledge,
	SemanticRelations as CanonicalSemanticRelations,
	DimensionId,
	DirectSemanticRelation,
	ParadigmProvenance,
} from "./generated/types.js";

export type {
	ConjugationClass,
	DimensionId,
	DirectSemanticRelation,
	GermanValencyComplement,
	GovernedCase,
	LocutionType,
	MorphologicalTreeNode,
	ParadigmChange,
	ParadigmProvenance,
	ParticipleSource,
	PendingSemanticRelation,
	PluralPattern,
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

/** A Paradigm Variant's id: the content key of its value (`banken`, `NoPlural`). */
export type VariantId = string;
/** A Reading's key in a Lemma Paradigm: its Dumling `readingIdentityKey`. */
export type ReadingKey = string;

/**
 * One alternative in one Variation Dimension (ADR 0048): one form or one
 * marker, `P` being the pack's value type. German stores one form string or a
 * marker.
 */
export type ParadigmVariant<P = string> = {
	readonly id: VariantId;
	readonly value: P;
	readonly provenance: ParadigmProvenance;
};

/**
 * One dimension of a Lemma Paradigm: one or more variants, sorted by id, and
 * each Licence a Reading states. A Reading absent from `licences` is Unstated
 * and takes every variant.
 */
export type ParadigmDimension<P = string> = {
	readonly variants: readonly ParadigmVariant<P>[];
	readonly licences: Readonly<Record<ReadingKey, readonly VariantId[]>>;
};

/**
 * A Lemma's inflectional alternatives and its Readings' Licences (ADR 0048),
 * stored on Dumdict's Lemma Record. It is grammatical, not Knowledge, and no
 * part of the Lemma's identity. A Lemma with no variants has an empty
 * `dimensions` map and derives its forms from the language's rules alone.
 */
export type LemmaParadigm<P = string> = {
	readonly dimensions: Readonly<
		Partial<Record<DimensionId, ParadigmDimension<P>>>
	>;
};

/**
 * Readings whose Licences agree in every dimension (ADR 0048), with what they
 * license per dimension and that selection's canonical `key`. They share one
 * inflection table.
 */
export type LicenceGroup = {
	readonly readings: readonly ReadingKey[];
	readonly selection: Readonly<
		Partial<Record<DimensionId, readonly VariantId[]>>
	>;
	readonly key: string;
};

/**
 * What `parseLemmaParadigm` and `applyParadigmChanges` answer: the Paradigm,
 * fresh, checked and in canonical order, or why it failed.
 */
export type ParadigmParse =
	| { readonly success: true; readonly value: LemmaParadigm }
	| { readonly success: false; readonly error: ParsingError };
