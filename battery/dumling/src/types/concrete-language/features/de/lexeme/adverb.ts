import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeAdverbFeatures = {
	inherent: {
		foreign: AbstractFeatureValue<"foreign"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Mult"
		> | null;
		pronType: Extract<
			AbstractFeatureValue<"pronType">,
			"Dem" | "Ind" | "Int" | "Neg" | "Rel"
		> | null;
	};
	inflectional: {
		degree: Extract<
			AbstractFeatureValue<"degree">,
			"Cmp" | "Pos" | "Sup"
		> | null;
	};
};
