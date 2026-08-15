import type {
	Lemma,
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
> = {
	lemma: Lemma<L, F, K>;
	emojiDescription: string;
};

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

export type SemanticRelations<
	Reading extends ReadingReference = ReadingReference,
> = Partial<Record<SemanticRelation, Reading[]>>;

export type LemmaKnowledge<TargetLang extends string = string> = {
	transcriptions?: [TargetLang] extends [never]
		? never
		: Record<TargetLang, NonEmptyStrings>;
};

export type ReadingKnowledge<
	TargetLang extends string = string,
	Reading extends ReadingReference = ReadingReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
> = {
	definition?: string;
	translations?: [TargetLang] extends [never]
		? never
		: Record<TargetLang, NonEmptyStrings>;
	morphologicalTree?: MorphologicalTree;
	lexicalBreakdown?: LexicalBreakdown<LexicalShadow>;
	semanticRelations?: SemanticRelations<Reading>;
};

export type PendingSemanticRelation<Shadow extends UnitShadow = UnitShadow> = {
	relation: SemanticRelation;
	target: Shadow;
};

export type SemanticRelationGraphEdge = {
	source: string;
	relation: SemanticRelation;
	target: string;
};

export type KnowledgeChange<
	TargetLang extends string = string,
	Reading extends ReadingReference = ReadingReference,
	LexicalShadow extends LexemeUnitShadow = LexemeUnitShadow,
> =
	| {
			kind: "Contribute" | "Correct";
			aspect: "transcriptions";
			language: TargetLang;
			value: NonEmptyStrings;
	  }
	| { kind: "Retract"; aspect: "transcriptions"; language: TargetLang }
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
			value: Reading[];
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
