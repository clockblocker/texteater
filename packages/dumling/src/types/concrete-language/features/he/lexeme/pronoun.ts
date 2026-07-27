import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HePronounFeatures = {
	inherent: {
		definite?: Extract<AbstractFeatureValue<"definite">, "Def">;
		pronType?: Extract<
			AbstractFeatureValue<"pronType">,
			"Dem" | "Ind" | "Int" | "Prs"
		>;
		reflex?: AbstractFeatureValue<"reflex">;
	};
	inflectional: {
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
	};
};
