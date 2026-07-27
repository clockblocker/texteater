import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeNounFeatures = {
	inherent: {
		gender?: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		>;
		hyph?: AbstractFeatureValue<"hyph">;
	};
	inflectional: {
		case?: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
