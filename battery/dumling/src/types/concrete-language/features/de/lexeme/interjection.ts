import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeInterjectionFeatures = {
	inherent: {
		partType?: Extract<AbstractFeatureValue<"partType">, "Res">;
	};
	inflectional: Record<never, never>;
};
