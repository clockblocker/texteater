import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeAdjectiveFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
	};
	inflectional: {
		definite: Extract<
			AbstractFeatureValue<"definite">,
			"Cons" | "Def"
		> | null;
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
