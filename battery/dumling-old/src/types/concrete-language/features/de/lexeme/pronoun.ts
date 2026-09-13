import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type DePronounFeatures = {
	core: {
		extPos: Extract<AbstractFeatureValue<"extPos">, "DET"> | null;
		foreign: AbstractFeatureValue<"foreign"> | null;
		person: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3"> | null;
		polite: Extract<AbstractFeatureValue<"polite">, "Form" | "Infm"> | null;
		poss: AbstractFeatureValue<"poss"> | null;
		pronType: Extract<
			AbstractFeatureValue<"pronType">,
			"Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot"
		> | null;
		referenceGender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
		referenceNumber: Extract<
			AbstractFeatureValue<"number">,
			"Plur" | "Sing"
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
		reflex: AbstractFeatureValue<"reflex"> | null;
	};
};
