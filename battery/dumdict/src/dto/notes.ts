import type { SemanticRelations } from "dumrel";
import type { SupportedLanguage } from "../dumling";
import type { Reading } from "./reading";

export type ReadingNoteForDisambiguation<L extends SupportedLanguage> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	semanticRelations?: SemanticRelations<Reading<L>>;
};
