import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type DeDeterminerFeatures = {
	inherent: {
		definite?: Extract<AbstractFeatureValue<"definite">, "Def" | "Ind">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADV" | "DET">;
		foreign?: AbstractFeatureValue<"foreign">;
		numType?: Extract<AbstractFeatureValue<"numType">, "Card" | "Ord">;
		person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
		polite?: Extract<AbstractFeatureValue<"polite">, "Form" | "Infm">;
		poss?: AbstractFeatureValue<"poss">;
		pronType?: Extract<
			AbstractFeatureValue<"pronType">,
			| "Art"
			| "Dem"
			| "Emp"
			| "Exc"
			| "Ind"
			| "Int"
			| "Neg"
			| "Prs"
			| "Rel"
			| "Tot"
		>;
	};
	inflectional: {
		case?: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Dat" | "Gen" | "Nom"
		>;
		degree?: Extract<AbstractFeatureValue<"degree">, "Cmp" | "Pos" | "Sup">;
		gender?:
			| Extract<AbstractFeatureValue<"gender">, "Masc" | "Neut">
			| readonly ["Masc", "Neut"]
			| readonly ["Neut", "Masc"];
		"gender[psor]"?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc" | "Neut">
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		"number[psor]"?: Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Sing"
		>;
	};
};
