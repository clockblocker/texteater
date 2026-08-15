import type {
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";
import type {
	MorphologicalRelation,
	SemanticRelation,
} from "./relation-vocabulary.js";

export type * from "./knowledge.js";
export type {
	LexicalRelation,
	MorphologicalRelation,
	Relation,
	RelationFamily,
	SemanticRelation,
} from "./relation-vocabulary.js";

/** The structural seam required of a Semantic Relation endpoint. */
export type ReadingRelationTarget<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	emojiDescription: string;
};

export type SemanticRelations<L extends SupportedLanguage> = Partial<
	Record<SemanticRelation, ReadingRelationTarget<L>[]>
>;

/** @deprecated Use SemanticRelations. */
export type LexicalRelations<L extends SupportedLanguage> =
	SemanticRelations<L>;

/** @deprecated New writes use Reading Knowledge Morphological Tree. */
export type MorphologicalRelations<L extends SupportedLanguage> = Partial<
	Record<MorphologicalRelation, Lemma<L>[]>
>;

export type RelationNotesForDisambiguation<L extends SupportedLanguage> = {
	lexical?: LexicalRelations<L>;
	morphological?: MorphologicalRelations<L>;
};

export type ProposedRelation<L extends SupportedLanguage> =
	| {
			relationFamily: "lexical";
			relation: SemanticRelation;
			target: ProposedLexicalRelationTarget<L>;
	  }
	| {
			relationFamily: "morphological";
			relation: MorphologicalRelation;
			target: ProposedMorphologicalRelationTarget<L>;
	  };

export type ProposedLexicalRelationTarget<L extends SupportedLanguage> =
	| { kind: "existing"; reading: ReadingRelationTarget<L> }
	| {
			kind: "pending";
			ref: PendingRelationTargetRef<L>;
	  };

export type ProposedMorphologicalRelationTarget<L extends SupportedLanguage> =
	| { kind: "existing"; lemma: Lemma<L> }
	| {
			kind: "pending";
			ref: PendingRelationTargetRef<L>;
	  };

export type PendingRelationTargetRef<L extends SupportedLanguage> = {
	canonicalForm: string;
	family: LemmaFamilyFor<L>;
	kind: LemmaKindFor<L, LemmaFamilyFor<L>>;
};
