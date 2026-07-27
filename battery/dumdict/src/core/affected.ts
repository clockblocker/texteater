import type { DumlingId, SupportedLanguage } from "../dumling";

export type AffectedDictionaryEntities<L extends SupportedLanguage> = {
	lemmaIds?: DumlingId<"Lemma", L>[];
	surfaceIds?: DumlingId<"Surface", L>[];
	pendingIds?: string[];
};
