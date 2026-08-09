import type { LexicalRelations, MorphologicalRelations } from "dumrel";
import type { Lemma, SupportedLanguage, Surface, SurfaceId } from "../dumling";
import type { Reading } from "./reading";

export type LemmaRecord<L extends SupportedLanguage> = {
	lemma: Lemma<L>;
	morphologicalRelations: MorphologicalRelations<L>;
};

export type ReadingEntry<L extends SupportedLanguage> = {
	reading: Reading<L>;
	lexicalRelations: LexicalRelations<L>;
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
