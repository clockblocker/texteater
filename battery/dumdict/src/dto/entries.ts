import type { LemmaKnowledge, ReadingKnowledge } from "dumrel";
import type {
	Lemma,
	Reading,
	SupportedLanguage,
	Surface,
	SurfaceId,
} from "../dumling";

export type LemmaRecord<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	knowledge?: LemmaKnowledge;
};

export type ReadingEntry<L extends SupportedLanguage> = {
	reading: Reading<L>;
	knowledge?: ReadingKnowledge<string, Reading<L>>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};

export type SurfaceEntry<L extends SupportedLanguage> = {
	id: SurfaceId<L>;
	surface: Surface<L>;
	ownerLemma: Lemma<L>;
	attestedTranslations: string[];
	attestations: string[];
	notes: string;
};
