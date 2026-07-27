import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeOtherFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		foreign?: AbstractFeatureValue<"foreign">;
		hyph?: AbstractFeatureValue<"hyph">;
		numType?: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Mult" | "Range"
		>;
	};
	inflectional: {
		case?: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		>;
		gender?: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		>;
		mood?: Extract<AbstractFeatureValue<"mood">, "Imp" | "Ind" | "Sub">;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		verbForm?: Extract<
			AbstractFeatureValue<"verbForm">,
			"Fin" | "Inf" | "Part"
		>;
	};
};
