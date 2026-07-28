import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

export type EnAuxiliaryFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		style: Extract<AbstractFeatureValue<"style">, "Arch" | "Vrnc"> | null;
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
			"Fin" | "Inf" | "Part"
		> | null;
	};
};
