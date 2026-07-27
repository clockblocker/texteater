import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeNumeralFeatures = {
	inherent: Record<never, never>;
	inflectional: {
		definite?: Extract<AbstractFeatureValue<"definite">, "Cons" | "Def">;
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
		number?: FeatureValueSet<
			Extract<AbstractFeatureValue<"number">, "Dual" | "Plur">
		>;
	};
};
