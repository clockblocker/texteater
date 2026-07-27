import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type HeAdpositionFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		case?: Extract<AbstractFeatureValue<"case">, "Acc" | "Gen">;
	};
	inflectional: Record<never, never>;
};
