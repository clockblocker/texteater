import type { SemanticRelations } from "dumrel";
import type { Reading, SupportedLanguage } from "../dumling";

export type ReadingNoteForDisambiguation<L extends SupportedLanguage> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	semanticRelations?: SemanticRelations<Reading<L>>;
};
