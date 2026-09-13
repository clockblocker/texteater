import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

export type ReadingNoteForDisambiguation<L extends Dumling.Language> = {
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
	semanticRelations?: Dumrel.SemanticRelations<Dumling.Reading<L>>;
};
