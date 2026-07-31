import type { SupportedLanguage } from "../dumling";
import type { RelationNotesForDisambiguation } from "./relations";

export type ReadingNoteForDisambiguation<L extends SupportedLanguage> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	relations?: RelationNotesForDisambiguation<L>;
};
