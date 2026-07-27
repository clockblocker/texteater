import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type DePronounFeatures = {
	inherent: {
		extPos?: Extract<AbstractFeatureValue<"extPos">, "DET">;
		foreign?: AbstractFeatureValue<"foreign">;
		person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
		polite?: Extract<AbstractFeatureValue<"polite">, "Form" | "Infm">;
		poss?: AbstractFeatureValue<"poss">;
		pronType?: Extract<
			AbstractFeatureValue<"pronType">,
			"Dem" | "Ind" | "Int" | "Neg" | "Prs" | "Rcp" | "Rel" | "Tot"
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
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		reflex?: AbstractFeatureValue<"reflex">;
	};
};
