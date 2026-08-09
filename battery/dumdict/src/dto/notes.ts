import type { RelationNotesForDisambiguation } from "dumrel";
import type { SupportedLanguage } from "../dumling";

export type ReadingNoteForDisambiguation<L extends SupportedLanguage> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	relations?: RelationNotesForDisambiguation<L>;
};
