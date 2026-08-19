import type { KnowledgeChange } from "dumrel";
import type { Lemma, Reading, SupportedLanguage } from "../dumling";

export type ReadingKnowledgeChange<L extends SupportedLanguage> = {
	reading: Reading<L>;
	change: KnowledgeChange<string, Lemma<L>>;
};
