import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeProperNounFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		foreign?: AbstractFeatureValue<"foreign">;
		gender?: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		>;
	};
	inflectional: {
		case?: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
