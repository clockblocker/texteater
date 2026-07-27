import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type DeVerbalInflectionalFeatures =
	| {
			number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
			tense?: Extract<AbstractFeatureValue<"tense">, "Past" | "Pres">;
			verbForm?: never;
			voice?: Extract<AbstractFeatureValue<"voice">, "Pass">;
	  }
	| {
			mood: Extract<AbstractFeatureValue<"mood">, "Imp">;
			number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
			person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
			tense?: never;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Fin">;
			voice?: Extract<AbstractFeatureValue<"voice">, "Pass">;
	  }
	| {
			mood?: Extract<AbstractFeatureValue<"mood">, "Ind" | "Sub">;
			number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
			person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
			tense?: Extract<AbstractFeatureValue<"tense">, "Past" | "Pres">;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Fin">;
			voice?: Extract<AbstractFeatureValue<"voice">, "Pass">;
	  }
	| {
			mood?: never;
			number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
			person?: never;
			tense?: never;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Inf">;
			voice?: Extract<AbstractFeatureValue<"voice">, "Pass">;
	  }
	| {
			aspect?: Extract<AbstractFeatureValue<"aspect">, "Perf">;
			gender?: Extract<
				AbstractFeatureValue<"gender">,
				"Fem" | "Masc" | "Neut"
			>;
			mood?: never;
			number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
			person?: never;
			tense?: Extract<AbstractFeatureValue<"tense">, "Past" | "Pres">;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Part">;
			voice?: Extract<AbstractFeatureValue<"voice">, "Pass">;
	  };

export type DeAuxiliaryFeatures = {
	inherent: {
		verbType?: "Mod";
	};
	inflectional: DeVerbalInflectionalFeatures;
};
