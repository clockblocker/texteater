import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnAdjectiveFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "ADV" | "SCONJ"
		> | null;
		numForm: Extract<
			AbstractFeatureValue<"numForm">,
			"Combi" | "Word"
		> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Frac" | "Ord"
		> | null;
		style: Extract<AbstractFeatureValue<"style">, "Expr"> | null;
	};
	inflectional: {
		degree: Extract<
			AbstractFeatureValue<"degree">,
			"Cmp" | "Pos" | "Sup"
		> | null;
	};
};
