import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HePronounFeatures = {
	core: {
		definite: Extract<AbstractFeatureValue<"definite">, "Def"> | null;
		pronType: Extract<
			AbstractFeatureValue<"pronType">,
			"Dem" | "Ind" | "Int" | "Prs"
		> | null;
		reflex: AbstractFeatureValue<"reflex"> | null;
	};
	inflectional: {
		gender: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
		person: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3"> | null;
	};
};
