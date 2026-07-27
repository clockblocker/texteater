import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnInterjectionFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		foreign?: AbstractFeatureValue<"foreign">;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg" | "Pos">;
		style?: Extract<AbstractFeatureValue<"style">, "Expr">;
	};
	inflectional: Record<never, never>;
};
