import type {
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "dumling/types";

import type { KnowledgeRequestMask } from "../types.js";

/** Exhaustive language Family/Kind authoring shape. */
export type RelMap<Language extends SupportedLanguage> = {
	[Family in LemmaFamilyFor<Language>]: {
		[Kind in LemmaKindFor<Language, Family>]: KnowledgeRequestMask;
	};
};
