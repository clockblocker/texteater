import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeAdpositionFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		adpType: Extract<
			AbstractFeatureValue<"adpType">,
			"Circ" | "Post" | "Prep"
		> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADV" | "SCONJ"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		governedCase: AbstractFeatureValue<"governedCase"> | null;
		partType: Extract<AbstractFeatureValue<"partType">, "Vbp"> | null;
	};
	inflectional: Record<never, never>;
};
