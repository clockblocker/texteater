import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DeAdjectiveFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Ord"
		> | null;
		variant: AbstractFeatureValue<"variant"> | null;
	};
	inflectional: {
		case: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		> | null;
		degree: Extract<
			AbstractFeatureValue<"degree">,
			"Cmp" | "Pos" | "Sup"
		> | null;
		gender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
