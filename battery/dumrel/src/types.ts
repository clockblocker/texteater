import type {
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";
import type { z } from "zod";
import type {
	lexicalRelationSchema,
	morphologicalRelationSchema,
	relationFamilySchema,
	relationSchema,
} from "./schema.js";

export type RelationFamily = z.infer<typeof relationFamilySchema>;
export type LexicalRelation = z.infer<typeof lexicalRelationSchema>;
export type MorphologicalRelation = z.infer<typeof morphologicalRelationSchema>;
export type Relation = z.infer<typeof relationSchema>;

/** The structural seam required of a lexical relation endpoint. */
export type ReadingRelationTarget<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	emojiDescription: string;
};

export type LexicalRelations<L extends SupportedLanguage> = Partial<
	Record<LexicalRelation, ReadingRelationTarget<L>[]>
>;

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
			relation: LexicalRelation;
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
