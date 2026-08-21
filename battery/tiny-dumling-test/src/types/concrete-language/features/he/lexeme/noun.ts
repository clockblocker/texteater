import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeNounFeatures = {
	core: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
	};
	inflectional: {
		definite: Extract<
			AbstractFeatureValue<"definite">,
			"Cons" | "Def"
		> | null;
		number: FeatureValueSet<
			Extract<AbstractFeatureValue<"number">, "Dual" | "Plur">
		> | null;
	};
};
