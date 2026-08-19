import type {
	Lemma as DumlingLemma,
	Reading as DumlingReading,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";
import type { semanticRelationValues } from "./vocabulary.js";

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

export type SemanticRelations<Lemma extends LemmaReference = LemmaReference> =
	Partial<Record<SemanticRelation, Lemma[]>>;

export type ReadingKnowledge<
	TargetLang extends string = string,
	Lemma extends LemmaReference = LemmaReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
> = {
	transcription?: string;
	definition?: string;
	translations?: [TargetLang] extends [never]
		? never
		: Record<TargetLang, NonEmptyStrings>;
	morphologicalTree?: MorphologicalTree;
	lexicalBreakdown?: LexicalBreakdown<LexicalShadow>;
	semanticRelations?: SemanticRelations<Lemma>;
};

export type PendingSemanticRelation<Shadow extends UnitShadow = UnitShadow> = {
	relation: SemanticRelation;
	target: Shadow;
};

export type SemanticRelationGraphReading = {
	reading: string;
	lemma: string;
};

export type SemanticRelationGraphEdge = {
	sourceReading: string;
	relation: SemanticRelation;
	targetLemma: string;
};

export type SemanticRelationGraph = {
	readings: SemanticRelationGraphReading[];
	edges: SemanticRelationGraphEdge[];
};

export type KnowledgeChange<
	TargetLang extends string = string,
	Lemma extends LemmaReference = LemmaReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
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
			relation: SemanticRelation;
			value: Lemma[];
	  }
	| {
			kind: "Retract";
			aspect: "semanticRelations";
			relation: SemanticRelation;
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
