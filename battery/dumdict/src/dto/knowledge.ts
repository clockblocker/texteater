import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

export type ReadingKnowledgeChange<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	change: Dumrel.KnowledgeChange<Dumling.Reading<L>>;
};
