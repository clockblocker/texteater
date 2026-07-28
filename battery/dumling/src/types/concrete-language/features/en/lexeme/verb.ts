import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnVerbFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "CCONJ" | "PROPN"
		> | null;
		hasGovPrep: AbstractFeatureValue<"hasGovPrep"> | null;
		phrasal: AbstractFeatureValue<"phrasal"> | null;
		style: Extract<AbstractFeatureValue<"style">, "Expr" | "Vrnc"> | null;
	};
	inflectional: {
		mood: Extract<
			AbstractFeatureValue<"mood">,
			"Imp" | "Ind" | "Sub"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
		person: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3"> | null;
		tense: Extract<AbstractFeatureValue<"tense">, "Past" | "Pres"> | null;
		verbForm: Extract<
			AbstractFeatureValue<"verbForm">,
			"Fin" | "Ger" | "Inf" | "Part"
		> | null;
		voice: Extract<AbstractFeatureValue<"voice">, "Pass"> | null;
	};
};
