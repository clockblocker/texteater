import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnInterjectionFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		polarity: Extract<
			AbstractFeatureValue<"polarity">,
			"Neg" | "Pos"
		> | null;
		style: Extract<AbstractFeatureValue<"style">, "Expr"> | null;
	};
	inflectional: Record<never, never>;
};
