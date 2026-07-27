import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeInterjectionFeatures = {
	inherent: {
		partType?: Extract<AbstractFeatureValue<"partType">, "Res">;
	};
	inflectional: Record<never, never>;
};
