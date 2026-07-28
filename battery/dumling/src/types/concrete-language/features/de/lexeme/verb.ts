import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type DeVerbalInflectionalFeatures =
	| {
			number: Extract<
				AbstractFeatureValue<"number">,
				"Plur" | "Sing"
			> | null;
			tense: Extract<
				AbstractFeatureValue<"tense">,
				"Past" | "Pres"
			> | null;
			verbForm: never | null;
			voice: Extract<AbstractFeatureValue<"voice">, "Pass"> | null;
	  }
	| {
			mood: Extract<AbstractFeatureValue<"mood">, "Imp">;
			number: Extract<
				AbstractFeatureValue<"number">,
				"Plur" | "Sing"
			> | null;
			person: Extract<
				AbstractFeatureValue<"person">,
				"1" | "2" | "3"
			> | null;
			tense: never | null;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Fin">;
			voice: Extract<AbstractFeatureValue<"voice">, "Pass"> | null;
	  }
	| {
			mood: Extract<AbstractFeatureValue<"mood">, "Ind" | "Sub"> | null;
			number: Extract<
				AbstractFeatureValue<"number">,
				"Plur" | "Sing"
			> | null;
			person: Extract<
				AbstractFeatureValue<"person">,
				"1" | "2" | "3"
			> | null;
			tense: Extract<
				AbstractFeatureValue<"tense">,
				"Past" | "Pres"
			> | null;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Fin">;
			voice: Extract<AbstractFeatureValue<"voice">, "Pass"> | null;
	  }
	| {
			mood: never | null;
			number: Extract<
				AbstractFeatureValue<"number">,
				"Plur" | "Sing"
			> | null;
			person: never | null;
			tense: never | null;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Inf">;
			voice: Extract<AbstractFeatureValue<"voice">, "Pass"> | null;
	  }
	| {
			aspect: Extract<AbstractFeatureValue<"aspect">, "Perf"> | null;
			gender: Extract<
				AbstractFeatureValue<"gender">,
				"Fem" | "Masc" | "Neut"
			> | null;
			mood: never | null;
			number: Extract<
				AbstractFeatureValue<"number">,
				"Plur" | "Sing"
			> | null;
			person: never | null;
			tense: Extract<
				AbstractFeatureValue<"tense">,
				"Past" | "Pres"
			> | null;
			verbForm: Extract<AbstractFeatureValue<"verbForm">, "Part">;
			voice: Extract<AbstractFeatureValue<"voice">, "Pass"> | null;
	  };

export type DeVerbFeatures = {
	inherent: {
		hasGovPrep: AbstractFeatureValue<"hasGovPrep"> | null;
		hasSepPrefix: AbstractFeatureValue<"hasSepPrefix"> | null;
		lexicallyReflexive: AbstractFeatureValue<"lexicallyReflexive"> | null;
		verbType: "Mod" | null;
	};
	inflectional: DeVerbalInflectionalFeatures;
};
