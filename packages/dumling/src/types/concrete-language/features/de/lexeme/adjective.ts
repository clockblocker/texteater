import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DeAdjectiveFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		foreign?: AbstractFeatureValue<"foreign">;
		numType?: Extract<AbstractFeatureValue<"numType">, "Card" | "Ord">;
		variant?: AbstractFeatureValue<"variant">;
	};
	inflectional: {
		case?: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		>;
		degree?: Extract<AbstractFeatureValue<"degree">, "Cmp" | "Pos" | "Sup">;
		gender?: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
