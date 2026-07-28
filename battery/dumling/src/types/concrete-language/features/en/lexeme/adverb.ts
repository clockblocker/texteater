import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type EnAdverbFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<
			AbstractFeatureValue<"extPos">,
			"ADP" | "ADV" | "CCONJ" | "SCONJ"
		> | null;
		numForm: Extract<AbstractFeatureValue<"numForm">, "Word"> | null;
		numType: Extract<
			AbstractFeatureValue<"numType">,
			"Frac" | "Mult" | "Ord"
		> | null;
		pronType: FeatureValueSet<
			Extract<
				AbstractFeatureValue<"pronType">,
				"Dem" | "Ind" | "Int" | "Neg" | "Rel" | "Tot"
			>
		> | null;
		style: Extract<AbstractFeatureValue<"style">, "Expr" | "Slng"> | null;
	};
	inflectional: {
		degree: Extract<
			AbstractFeatureValue<"degree">,
			"Cmp" | "Pos" | "Sup"
		> | null;
	};
};
