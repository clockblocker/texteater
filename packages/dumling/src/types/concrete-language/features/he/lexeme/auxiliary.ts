import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeAuxiliaryFeatures = {
	inherent: {
		verbType?: Extract<AbstractFeatureValue<"verbType">, "Cop" | "Mod">;
	};
	inflectional: {
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		person?: FeatureValueSet<
			Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">
		>;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg" | "Pos">;
		tense?: Extract<AbstractFeatureValue<"tense">, "Fut" | "Past">;
		verbForm?: Extract<AbstractFeatureValue<"verbForm">, "Inf" | "Part">;
	};
};
