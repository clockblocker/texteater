import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeInterjectionFeatures = {
	core: {
		partType: Extract<AbstractFeatureValue<"partType">, "Res"> | null;
	};
	inflectional: Record<never, never>;
};
