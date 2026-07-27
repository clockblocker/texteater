import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type EnPronounFeatures = {
	inherent: {
		abbr?: AbstractFeatureValue<"abbr">;
		extPos?: Extract<AbstractFeatureValue<"extPos">, "ADV" | "PRON">;
		person?: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3">;
		poss?: AbstractFeatureValue<"poss">;
		pronType?: FeatureValueSet<
			Extract<
				AbstractFeatureValue<"pronType">,
				| "Dem"
				| "Emp"
				| "Ind"
				| "Int"
				| "Neg"
				| "Prs"
				| "Rcp"
				| "Rel"
				| "Tot"
			>
		>;
		style?: Extract<
			AbstractFeatureValue<"style">,
			"Arch" | "Coll" | "Expr" | "Slng" | "Vrnc"
		>;
	};
	inflectional: {
		case?: Extract<AbstractFeatureValue<"case">, "Acc" | "Gen" | "Nom">;
		gender?: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		>;
		number?: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing">;
		reflex?: AbstractFeatureValue<"reflex">;
	};
};
