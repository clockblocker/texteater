import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeProperNounFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
	};
	inflectional: {
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
