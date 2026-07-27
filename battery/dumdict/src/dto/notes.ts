import type { Lemma, SupportedLanguage } from "../dumling";
import type { RelationNotesForDisambiguation } from "./relations";

export type LemmaNoteForDisambiguation<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	relations?: RelationNotesForDisambiguation<L>;
};

