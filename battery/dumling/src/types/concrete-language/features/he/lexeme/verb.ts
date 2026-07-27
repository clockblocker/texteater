import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type HeVerbFeatures = {
	inherent: {
		hebBinyan?: AbstractFeatureValue<"hebBinyan">;
		hebExistential?: AbstractFeatureValue<"hebExistential">;
	};
	inflectional: {
		definite?: Extract<AbstractFeatureValue<"definite">, "Cons" | "Def">;
		gender?: FeatureValueSet<
			Extract<AbstractFeatureValue<"gender">, "Fem" | "Masc">
		>;
		mood?: Extract<AbstractFeatureValue<"mood">, "Imp">;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		person?: FeatureValueSet<
			Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">
		>;
		polarity?: Extract<AbstractFeatureValue<"polarity">, "Neg" | "Pos">;
		tense?: Extract<AbstractFeatureValue<"tense">, "Fut" | "Past">;
		verbForm?: Extract<AbstractFeatureValue<"verbForm">, "Inf" | "Part">;
		voice?: Extract<AbstractFeatureValue<"voice">, "Act" | "Mid" | "Pass">;
	};
};
