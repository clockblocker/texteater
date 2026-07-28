import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeVerbFeatures = {
	inherent: {
		hebBinyan: AbstractFeatureValue<"hebBinyan"> | null;
		hebExistential: AbstractFeatureValue<"hebExistential"> | null;
	};
	inflectional: {
		definite: Extract<
			AbstractFeatureValue<"definite">,
			"Cons" | "Def"
		> | null;
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
		mood: Extract<AbstractFeatureValue<"mood">, "Imp"> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
		person: FeatureValueSet<
			Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">
		> | null;
		polarity: Extract<
			AbstractFeatureValue<"polarity">,
			"Neg" | "Pos"
		> | null;
		tense: Extract<AbstractFeatureValue<"tense">, "Fut" | "Past"> | null;
		verbForm: Extract<
			AbstractFeatureValue<"verbForm">,
			"Inf" | "Part"
		> | null;
		voice: Extract<
			AbstractFeatureValue<"voice">,
			"Act" | "Mid" | "Pass"
		> | null;
	};
};
