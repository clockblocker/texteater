import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeAdpositionFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		adpType?: Extract<
			AbstractFeatureValue<"adpType">,
			"Circ" | "Post" | "Prep"
		>;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADV" | "SCONJ">;
		foreign?: AbstractFeatureValue<"foreign">;
		governedCase?: AbstractFeatureValue<"governedCase">;
		partType?: Extract<AbstractFeatureValue<"partType">, "Vbp">;
	};
	inflectional: Record<never, never>;
};
