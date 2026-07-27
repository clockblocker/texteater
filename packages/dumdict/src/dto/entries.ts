import type { DumlingId, Lemma, SupportedLanguage, Surface } from "../dumling";
import type { LexicalRelations, MorphologicalRelations } from "./relations";

export type LemmaEntry<L extends SupportedLanguage> = {
	id: DumlingId<"Lemma", L>;
	lemma: Lemma<L>;
	lexicalRelations: LexicalRelations<L>;
	morphologicalRelations: MorphologicalRelations<L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type SurfaceEntry<L extends SupportedLanguage> = {
	id: DumlingId<"Surface", L>;
	surface: Surface<L>;
	ownerLemmaId: DumlingId<"Lemma", L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

