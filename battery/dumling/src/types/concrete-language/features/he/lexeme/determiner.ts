import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeDeterminerFeatures = {
	inherent: {
		pronType: Extract<
			AbstractFeatureValue<"pronType">,
			"Art" | "Int"
		> | null;
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
