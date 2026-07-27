import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeProperNounFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
	};
	inflectional: {
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
