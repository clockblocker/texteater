import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnAdjectiveFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "ADV" | "SCONJ"
		>;
		numForm?: Extract<AbstractFeatureValue<"numForm">, "Combi" | "Word">;
		numType?: Extract<AbstractFeatureValue<"numType">, "Frac" | "Ord">;
		style?: Extract<AbstractFeatureValue<"style">, "Expr">;
	};
	inflectional: {
		degree?: Extract<AbstractFeatureValue<"degree">, "Cmp" | "Pos" | "Sup">;
	};
};
