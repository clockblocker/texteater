import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type DeDeterminerFeatures = {
	inherent: {
		definite: Extract<
			AbstractFeatureValue<"definite">,
			"Def" | "Ind"
		> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADV" | "DET"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Card" | "Ord"
		> | null;
		person: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3"> | null;
		polite: Extract<AbstractFeatureValue<"polite">, "Form" | "Infm"> | null;
		poss: AbstractFeatureValue<"poss"> | null;
		pronType: Extract<
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
		> | null;
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
		gender:
			| Extract<AbstractFeatureValue<"gender">, "Masc" | "Neut">
			| readonly ["Masc", "Neut"]
			| readonly ["Neut", "Masc"]
			| null;
		"gender[psor]": FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc" | "Neut">
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
		"number[psor]": Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Sing"
		> | null;
	};
};
