import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeAdjectiveFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
	};
	inflectional: {
		definite?: Extract<AbstractFeatureValue<"definite">, "Cons" | "Def">;
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
