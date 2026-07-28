import type { AbstractFeatureValue } from "../../../../abstract/features/features-catalog.js";

type FeatureValueSet<T> = T | readonly [T, ...T[]];

export type EnPronounFeatures = {
	inherent: {
		abbr: AbstractFeatureValue<"abbr"> | null;
		extPos: Extract<AbstractFeatureValue<"extPos">, "ADV" | "PRON"> | null;
		person: Extract<AbstractFeatureValue<"person">, "1" | "2" | "3"> | null;
		poss: AbstractFeatureValue<"poss"> | null;
		pronType: FeatureValueSet<
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
		> | null;
		style: Extract<
			AbstractFeatureValue<"style">,
			"Arch" | "Coll" | "Expr" | "Slng" | "Vrnc"
		> | null;
	};
	inflectional: {
		case: Extract<
			AbstractFeatureValue<"case">,
			"Acc" | "Gen" | "Nom"
		> | null;
		gender: Extract<
			AbstractFeatureValue<"gender">,
			"Fem" | "Masc" | "Neut"
		> | null;
		number: Extract<AbstractFeatureValue<"number">, "Plur" | "Sing"> | null;
		reflex: AbstractFeatureValue<"reflex"> | null;
	};
};
