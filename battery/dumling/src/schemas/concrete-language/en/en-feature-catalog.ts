import { UNIVERSAL_FEATURE_SCHEMA } from "../../universal/features/catalog.js";

export const EN_FEATURE_SCHEMA = {
	...UNIVERSAL_FEATURE_SCHEMA,
	comparable: UNIVERSAL_FEATURE_SCHEMA.comparable,
} as const;
