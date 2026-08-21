import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnAdpositionFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "ADV" | "SCONJ"
		> | null;
	};
	inflectional: Record<never, never>;
};
