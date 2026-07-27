import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type EnDeterminerFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		definite?: Extract<AbstractFeatureValue<"definite">, "Def" | "Ind">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADV" | "PRON">;
		numForm?: Extract<AbstractFeatureValue<"numForm">, "Word">;
		numType?: Extract<AbstractFeatureValue<"numType">, "Frac">;
		pronType?: FeatureValueSet<
			Extract<
				AbstractFeatureValue<"pronType">,
				"Art" | "Dem" | "Ind" | "Int" | "Neg" | "Rcp" | "Rel" | "Tot"
			>
		>;
		style?: Extract<AbstractFeatureValue<"style">, "Vrnc">;
	};
	inflectional: {
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
	};
};
