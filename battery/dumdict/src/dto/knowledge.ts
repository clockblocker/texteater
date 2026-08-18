import type { KnowledgeChange } from "dumrel";
import type { Reading, SupportedLanguage } from "../dumling";

export type LemmaKnowledgeChange<L extends SupportedLanguage> = {
	owner: { kind: "Lemma"; lemma: Reading<L>["lemma"] };
	change: Extract<KnowledgeChange, { aspect: "transcriptions" }>;
};

export type ReadingKnowledgeChange<L extends SupportedLanguage> = {
	owner: { kind: "Reading"; reading: Reading<L> };
	change: Exclude<
		KnowledgeChange<string, Reading<L>>,
		{ aspect: "transcriptions" }
	>;
};

export type DumdictKnowledgeChange<L extends SupportedLanguage> =
	| LemmaKnowledgeChange<L>
	| ReadingKnowledgeChange<L>;
