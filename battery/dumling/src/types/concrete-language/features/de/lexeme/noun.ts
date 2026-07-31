import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeNounFeatures = {
	core: {
		gender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
		hyph: AbstractFeatureValue<"hyph"> | null;
	};
	inflectional: {
		case: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
