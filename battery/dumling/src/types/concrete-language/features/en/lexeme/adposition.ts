import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnAdpositionFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "ADV" | "SCONJ"
		>;
	};
	inflectional: Record<never, never>;
};
