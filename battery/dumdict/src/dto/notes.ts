import type { Lemma, SupportedLanguage } from "dumling/types";
import type { SemanticRelations } from "dumrel/types";

export type ReadingNoteForDisambiguation<L extends SupportedLanguage> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	semanticRelations?: SemanticRelations<Lemma<L>>;
};
