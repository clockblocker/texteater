import type { SemanticRelations } from "dumrel";
import type { Lemma, SupportedLanguage } from "../dumling";

export type ReadingNoteForDisambiguation<L extends SupportedLanguage> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	semanticRelations?: SemanticRelations<Lemma<L>>;
};
