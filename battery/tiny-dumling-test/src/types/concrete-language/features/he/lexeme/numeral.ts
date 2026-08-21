import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeNumeralFeatures = {
	core: Record<never, never>;
	inflectional: {
		definite: Extract<
			AbstractFeatureValue<"definite">,
			"Cons" | "Def"
		> | null;
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
		number: FeatureValueSet<
			Extract<AbstractFeatureValue<"number">, "Dual" | "Plur">
		> | null;
	};
};
