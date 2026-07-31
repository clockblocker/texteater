import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type HeAdpositionFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		case: Extract<AbstractFeatureValue<"case">, "Acc" | "Gen"> | null;
	};
	inflectional: Record<never, never>;
};
