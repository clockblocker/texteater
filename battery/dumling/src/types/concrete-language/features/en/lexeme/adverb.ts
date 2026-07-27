import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type EnAdverbFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "ADV" | "CCONJ" | "SCONJ"
		>;
		numForm?: Extract<AbstractFeatureValue<"numForm">, "Word">;
		numType?: Extract<
			AbstractFeatureValue<"numType">,
			"Frac" | "Mult" | "Ord"
		>;
		pronType?: FeatureValueSet<
			Extract<
				AbstractFeatureValue<"pronType">,
				"Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot"
			>
		>;
		style?: Extract<AbstractFeatureValue<"style">, "Expr" | "Slng">;
	};
	inflectional: {
		degree?: Extract<AbstractFeatureValue<"degree">, "Cmp" | "Pos" | "Sup">;
	};
};
