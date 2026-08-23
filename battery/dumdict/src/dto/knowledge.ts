import type { Lemma, Reading, SupportedLanguage } from "dumling/types";
import type { KnowledgeChange, LexemeUnitShadow } from "dumrel/types";

export type ReadingKnowledgeChange<L extends SupportedLanguage> = {
	reading: Reading<L>;
	change: KnowledgeChange<string, Lemma<L>, LexemeUnitShadow, Reading<L>>;
};
