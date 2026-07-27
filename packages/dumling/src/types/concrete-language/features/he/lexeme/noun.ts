import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeNounFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
	};
	inflectional: {
		definite?: Extract<AbstractFeatureValue<"definite">, "Cons" | "Def">;
		number?: FeatureValueSet<
			Extract<AbstractFeatureValue<"number">, "Dual" | "Plur">
		>;
	};
};
