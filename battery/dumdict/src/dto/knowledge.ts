import type { Lemma, Reading, SupportedLanguage } from "dumling/types";
import type { KnowledgeChange } from "dumrel/types";

export type ReadingKnowledgeChange<L extends SupportedLanguage> = {
	reading: Reading<L>;
	change: KnowledgeChange<string, Lemma<L>>;
};
