import type { DumlingId, SupportedLanguage } from "../dumling";

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
	Record<LexicalRelation, DumlingId<"Lemma", L>[]>
>;

export type MorphologicalRelations<L extends SupportedLanguage> = Partial<
	Record<MorphologicalRelation, DumlingId<"Lemma", L>[]>
>;

export type RelationNotesForDisambiguation<L extends SupportedLanguage> = {
	lexical?: LexicalRelations<L>;
	morphological?: MorphologicalRelations<L>;
};

export type ProposedRelation<L extends SupportedLanguage> =
	| {
			relationFamily: "lexical";
			relation: LexicalRelation;
			target: ProposedRelationTarget<L>;
	  }
	| {
			relationFamily: "morphological";
			relation: MorphologicalRelation;
			target: ProposedRelationTarget<L>;
	  };

export type ProposedRelationTarget<L extends SupportedLanguage> =
	| { kind: "existing"; lemmaId: DumlingId<"Lemma", L> }
	| {
			kind: "pending";
			ref: PendingRelationTargetRef<L>;
	  };

export type PendingRelationTargetRef<L extends SupportedLanguage> = {
	canonicalLemma: string;
	lemmaKind: import("../dumling").LemmaKindFor<L>;
	lemmaSubKind: import("../dumling").LemmaSubKindFor<
		L,
		import("../dumling").LemmaKindFor<L>
	>;
};

