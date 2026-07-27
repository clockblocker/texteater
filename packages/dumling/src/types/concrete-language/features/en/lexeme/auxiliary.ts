import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

export type EnAuxiliaryFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		style?: Extract<AbstractFeatureValue<"style">, "Arch" | "Vrnc">;
	};
	inflectional: {
		mood?: Extract<AbstractFeatureValue<"mood">, "Imp" | "Ind" | "Sub">;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
		tense?: Extract<AbstractFeatureValue<"tense">, "Past" | "Pres">;
		verbForm?: Extract<
			AbstractFeatureValue<"verbForm">,
			"Fin" | "Inf" | "Part"
		>;
	};
};
