import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type EnDeterminerFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		definite: Extract<
			AbstractFeatureValue<"definite">,
			"Def" | "Ind"
		> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADV" | "PRON"> | null;
		numForm: Extract<AbstractFeatureValue<"numForm">, "Word"> | null;
		numType: Extract<AbstractFeatureValue<"numType">, "Frac"> | null;
		pronType: FeatureValueSet<
			Extract<
				AbstractFeatureValue<"pronType">,
				"Art" | "Dem" | "Ind" | "Int" | "Neg" | "Rcp" | "Rel" | "Tot"
			>
		> | null;
		style: Extract<AbstractFeatureValue<"style">, "Vrnc"> | null;
	};
	inflectional: {
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
	};
};
