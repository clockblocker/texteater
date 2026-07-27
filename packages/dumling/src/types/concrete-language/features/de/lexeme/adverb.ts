import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeAdverbFeatures = {
	inherent: {
		foreign?: AbstractFeatureValue<"foreign">;
		numType?: Extract<AbstractFeatureValue<"numType">, "Card" | "Mult">;
		pronType?: Extract<
			AbstractFeatureValue<"pronType">,
			"Dem" | "Ind" | "Int" | "Neg" | "Rel"
		>;
	};
	inflectional: {
		degree?: Extract<AbstractFeatureValue<"degree">, "Cmp" | "Pos" | "Sup">;
	};
};
