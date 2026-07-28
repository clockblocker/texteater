import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeSymbolFeatures = {
	inherent: {
		foreign: AbstractFeatureValue<"foreign"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Range"
		> | null;
	};
	inflectional: {
		case: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		> | null;
		gender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
