import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeOtherFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		hyph: AbstractFeatureValue<"hyph"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Mult" | "Range"
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
		mood: Extract<
			AbstractFeatureValue<"mood">,
			"Imp" | "Ind" | "Sub"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
		verbForm: Extract<
			AbstractFeatureValue<"verbForm">,
			"Fin" | "Inf" | "Part"
		> | null;
	};
};
