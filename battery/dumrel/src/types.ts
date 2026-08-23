import type {
	Lemma as DumlingLemma,
	Reading as DumlingReading,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";
import type {
	directSemanticRelationValues,
	grammaticalRelationValues,
	grammaticalSeriesAxisValues,
	semanticRelationValues,
} from "./vocabulary.js";

export type NonEmptyStrings = [string, ...string[]];

export type UnitShadow<
	L extends SupportedLanguage = SupportedLanguage,
	F extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
> = {
	language: L;
	canonicalForm: string;
	family: F;
	kind: LemmaKindFor<L, F>;
};

export type LexicalUnitShadow<L extends SupportedLanguage = SupportedLanguage> =
	| UnitShadow<L, Extract<LemmaFamilyFor<L>, "Lexeme">>
	| UnitShadow<L, Extract<LemmaFamilyFor<L>, "Phraseme">>;

export type LexemeUnitShadow<L extends SupportedLanguage = SupportedLanguage> =
	UnitShadow<L, Extract<LemmaFamilyFor<L>, "Lexeme">>;

export type ReadingReference<
	L extends SupportedLanguage = SupportedLanguage,
	F extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
	K extends LemmaKindFor<L, F> = LemmaKindFor<L, F>,
> = DumlingReading<L, F, K>;

export type LemmaReference<
	L extends SupportedLanguage = SupportedLanguage,
	F extends LemmaFamilyFor<L> = LemmaFamilyFor<L>,
	K extends LemmaKindFor<L, F> = LemmaKindFor<L, F>,
> = DumlingLemma<L, F, K>;

export type MorphemeReadingReference<
	L extends SupportedLanguage = SupportedLanguage,
> = ReadingReference<
	L,
	Extract<LemmaFamilyFor<L>, "Morpheme">,
	LemmaKindFor<L, Extract<LemmaFamilyFor<L>, "Morpheme">>
>;

export type MorphologicalTreeNode<
	MorphemeReading extends MorphemeReadingReference = MorphemeReadingReference,
	LexicalShadow extends LexicalUnitShadow = LexicalUnitShadow,
> =
	| { nodeKind: "morphemeReading"; reading: MorphemeReading }
	| { nodeKind: "unitShadow"; unitShadow: LexicalShadow }
	| MorphologicalTreeStructure<MorphemeReading, LexicalShadow>;

export type MorphologicalTreeStructure<
	MorphemeReading extends MorphemeReadingReference = MorphemeReadingReference,
	LexicalShadow extends LexicalUnitShadow = LexicalUnitShadow,
> = {
	nodeKind: "structure";
	children: [
		MorphologicalTreeNode<MorphemeReading, LexicalShadow>,
		...MorphologicalTreeNode<MorphemeReading, LexicalShadow>[],
	];
};

export type MorphologicalTree<
	MorphemeReading extends MorphemeReadingReference = MorphemeReadingReference,
	LexicalShadow extends LexicalUnitShadow = LexicalUnitShadow,
> = {
	root: MorphologicalTreeStructure<MorphemeReading, LexicalShadow>;
};

export type LexicalBreakdown<
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
> = [LexicalShadow, LexicalShadow, ...LexicalShadow[]];

export type SemanticRelation = (typeof semanticRelationValues)[number];
export type DirectSemanticRelation =
	(typeof directSemanticRelationValues)[number];

export type GrammaticalRelation = (typeof grammaticalRelationValues)[number];
export type GrammaticalSeriesAxis =
	(typeof grammaticalSeriesAxisValues)[number];
export type GrammaticalEndpointKind = "lemma" | "reading";

export type LemmaGrammaticalRelationClaim<
	Lemma extends LemmaReference = LemmaReference,
> = Readonly<{
	endpointKind: "lemma";
	relation: GrammaticalRelation;
	source: Lemma;
	target: Lemma;
}>;

export type ReadingGrammaticalRelationClaim<
	Reading extends ReadingReference = ReadingReference,
> = Readonly<{
	endpointKind: "reading";
	relation: GrammaticalRelation;
	source: Reading;
	target: Reading;
}>;

export type GrammaticalRelationClaim<
	Lemma extends LemmaReference = LemmaReference,
	Reading extends ReadingReference = ReadingReference,
> =
	| LemmaGrammaticalRelationClaim<Lemma>
	| ReadingGrammaticalRelationClaim<Reading>;

export type GrammaticalSeriesMember<Endpoint> = Readonly<{
	axisValue: string;
	endpoint: Endpoint;
}>;

type GrammaticalSeriesBase = Readonly<{
	relation: GrammaticalRelation;
	axis: GrammaticalSeriesAxis;
	fixedCoordinates: Readonly<Record<string, string | null>>;
}>;

export type LemmaGrammaticalSeries<
	Lemma extends LemmaReference = LemmaReference,
> = GrammaticalSeriesBase &
	Readonly<{
		endpointKind: "lemma";
		members: readonly [
			GrammaticalSeriesMember<Lemma>,
			...GrammaticalSeriesMember<Lemma>[],
		];
	}>;

export type ReadingGrammaticalSeries<
	Reading extends ReadingReference = ReadingReference,
> = GrammaticalSeriesBase &
	Readonly<{
		endpointKind: "reading";
		members: readonly [
			GrammaticalSeriesMember<Reading>,
			...GrammaticalSeriesMember<Reading>[],
		];
	}>;

export type GrammaticalSeries<
	Lemma extends LemmaReference = LemmaReference,
	Reading extends ReadingReference = ReadingReference,
> = LemmaGrammaticalSeries<Lemma> | ReadingGrammaticalSeries<Reading>;

export type GrammaticalRelationProjection<
	Lemma extends LemmaReference = LemmaReference,
	Reading extends ReadingReference = ReadingReference,
> = GrammaticalRelationClaim<Lemma, Reading> &
	Readonly<{ provenance: "direct" | "inferred" }>;

/**
 * One application-wide user choice for every Knowledge leaf that Dumrel can
 * select. Applicability remains language/Family/Kind-specific; settings do
 * not.
 */
export type KnowledgeSettings = Readonly<{
	transcription: boolean;
	definition: boolean;
	translations: Readonly<{ en: boolean }>;
	morphologicalTree: boolean;
	lexicalBreakdown: boolean;
	semanticRelations: Readonly<Record<SemanticRelation, boolean>>;
}>;

/**
 * A sparse Knowledge selection. A present null leaf is requested; an absent
 * leaf is not requested. The empty mask is valid.
 */
export type KnowledgeRequestMask = Readonly<{
	transcription?: null;
	definition?: null;
	translations?: Readonly<{ en?: null }>;
	morphologicalTree?: null;
	lexicalBreakdown?: null;
	semanticRelations?: Readonly<Partial<Record<SemanticRelation, null>>>;
}>;

/** The homogeneous endpoint mode selected by one Reading Knowledge value. */
export type SemanticRelationTargetKind = "lemma" | "reading";

export type LemmaTargetedSemanticRelations<
	Lemma extends LemmaReference = LemmaReference,
> = { targetKind?: "lemma" } & Partial<Record<DirectSemanticRelation, Lemma[]>>;

export type ReadingTargetedSemanticRelations<
	Reading extends ReadingReference = ReadingReference,
> = {
	targetKind: "reading";
	synonym?: Reading[];
} & Partial<Record<Exclude<DirectSemanticRelation, "synonym">, never>>;

export type SemanticRelations<
	Lemma extends LemmaReference = LemmaReference,
	Reading extends ReadingReference = ReadingReference,
> =
	| LemmaTargetedSemanticRelations<Lemma>
	| ReadingTargetedSemanticRelations<Reading>;

/** Read-only relation buckets after graph inference. Never a persistence DTO. */
export type ProjectedSemanticRelations<
	Lemma extends LemmaReference = LemmaReference,
	Reading extends ReadingReference = ReadingReference,
> =
	| ({ targetKind?: "lemma" } & Partial<Record<SemanticRelation, Lemma[]>>)
	| ({ targetKind: "reading" } & Partial<
			Record<SemanticRelation, Reading[]>
	  >);

export type ReadingKnowledge<
	TargetLang extends string = string,
	Lemma extends LemmaReference = LemmaReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
	Reading extends ReadingReference = ReadingReference,
> = {
	transcription?: string;
	definition?: string;
	translations?: [TargetLang] extends [never]
		? never
		: Record<TargetLang, NonEmptyStrings>;
	morphologicalTree?: MorphologicalTree;
	lexicalBreakdown?: LexicalBreakdown<LexicalShadow>;
	semanticRelations?: SemanticRelations<Lemma, Reading>;
};

export type PendingSemanticRelation<Shadow extends UnitShadow = UnitShadow> = {
	relation: DirectSemanticRelation;
	target: Shadow;
};

export type SemanticRelationGraphReading = {
	reading: string;
	lemma: string;
	relationTargetKind?: SemanticRelationTargetKind;
};

/** A Lemma-targeted edge in the default relation mode. */
export type LemmaTargetedSemanticRelationGraphEdge = {
	sourceReading: string;
	relation: SemanticRelation;
	targetKind?: "lemma";
	targetLemma: string;
};

export type ReadingTargetedSemanticRelationGraphEdge = {
	sourceReading: string;
	relation: SemanticRelation;
	targetKind: "reading";
	targetReading: string;
};

export type SemanticRelationGraphEdge =
	| LemmaTargetedSemanticRelationGraphEdge
	| ReadingTargetedSemanticRelationGraphEdge;

export type DirectSemanticRelationGraphEdge =
	| (Omit<LemmaTargetedSemanticRelationGraphEdge, "relation"> & {
			relation: DirectSemanticRelation;
	  })
	| (Omit<ReadingTargetedSemanticRelationGraphEdge, "relation"> & {
			relation: "synonym";
	  });

export type SemanticRelationGraphProjection = SemanticRelationGraphEdge & {
	provenance: "direct" | "inferred";
};

export type SemanticRelationGraph = {
	readings: SemanticRelationGraphReading[];
	edges: DirectSemanticRelationGraphEdge[];
};

export type KnowledgeChange<
	TargetLang extends string = string,
	Lemma extends LemmaReference = LemmaReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
	Reading extends ReadingReference = ReadingReference,
> =
	| {
			kind: "Contribute" | "Correct";
			aspect: "transcription";
			value: string;
	  }
	| { kind: "Retract"; aspect: "transcription" }
	| {
			kind: "Contribute" | "Correct";
			aspect: "translations";
			language: TargetLang;
			value: NonEmptyStrings;
	  }
	| { kind: "Retract"; aspect: "translations"; language: TargetLang }
	| {
			kind: "Contribute" | "Correct";
			aspect: "semanticRelations";
			relation: DirectSemanticRelation;
			targetKind?: "lemma";
			value: Lemma[];
	  }
	| {
			kind: "Contribute" | "Correct";
			aspect: "semanticRelations";
			relation: "synonym";
			targetKind: "reading";
			value: Reading[];
	  }
	| {
			kind: "Retract";
			aspect: "semanticRelations";
			relation: DirectSemanticRelation;
			targetKind?: "lemma";
	  }
	| {
			kind: "Retract";
			aspect: "semanticRelations";
			relation: "synonym";
			targetKind: "reading";
	  }
	| {
			kind: "Contribute" | "Correct";
			aspect: "definition";
			value: string;
	  }
	| { kind: "Retract"; aspect: "definition" }
	| {
			kind: "Contribute" | "Correct";
			aspect: "morphologicalTree";
			value: MorphologicalTree;
	  }
	| { kind: "Retract"; aspect: "morphologicalTree" }
	| {
			kind: "Contribute" | "Correct";
			aspect: "lexicalBreakdown";
			value: LexicalBreakdown<LexicalShadow>;
	  }
	| { kind: "Retract"; aspect: "lexicalBreakdown" };
