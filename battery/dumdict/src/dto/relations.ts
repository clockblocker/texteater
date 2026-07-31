import type {
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "../dumling";
import type { Reading } from "./reading";

export type RelationFamily = "lexical" | "morphological";

export type LexicalRelation =
	| "synonym"
	| "nearSynonym"
	| "antonym"
	| "hypernym"
	| "hyponym"
	| "meronym"
	| "holonym";

export type MorphologicalRelation =
	| "consistsOf"
	| "usedIn"
	| "derivedFrom"
	| "sourceFor";

export type LexicalRelations<L extends SupportedLanguage> = Partial<
	Record<LexicalRelation, Reading<L>[]>
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
	| { kind: "existing"; reading: Reading<L> }
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
