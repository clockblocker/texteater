import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnVerbFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "CCONJ" | "PROPN"
		>;
		hasGovPrep?: AbstractFeatureValue<"hasGovPrep">;
		phrasal?: AbstractFeatureValue<"phrasal">;
		style?: Extract<AbstractFeatureValue<"style">, "Expr" | "Vrnc">;
	};
	inflectional: {
		mood?: Extract<AbstractFeatureValue<"mood">, "Imp" | "Ind" | "Sub">;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
		tense?: Extract<AbstractFeatureValue<"tense">, "Past" | "Pres">;
		verbForm?: Extract<
			AbstractFeatureValue<"verbForm">,
			"Fin" | "Ger" | "Inf" | "Part"
		>;
		voice?: Extract<AbstractFeatureValue<"voice">, "Pass">;
	};
};
