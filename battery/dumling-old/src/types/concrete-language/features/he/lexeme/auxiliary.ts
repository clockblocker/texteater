import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeAuxiliaryFeatures = {
	core: {
		verbType: Extract<
			AbstractFeatureValue<"verbType">,
			"Cop" | "Mod"
		> | null;
	};
	inflectional: {
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
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
	};
};
