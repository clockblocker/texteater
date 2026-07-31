import type { Lemma, SupportedLanguage } from "../dumling";

export type Reading<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	emojiDescription: string;
};
