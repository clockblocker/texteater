import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnPronounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADV", "PRON"]),
		person: EN_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
		poss: EN_FEATURE_SCHEMA.poss,
		pronType: featureValueSetSchema(
			EN_FEATURE_SCHEMA.pronType.extract([
				"Dem",
				"Emp",
				"Ind",
				"Int",
				"Neg",
				"Prs",
				"Rcp",
				"Rel",
				"Tot",
			]),
		),
		style: EN_FEATURE_SCHEMA.style.extract([
			"Arch",
			"Coll",
			"Expr",
			"Slng",
			"Vrnc",
		]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			case: EN_FEATURE_SCHEMA.case.extract(["Acc", "Gen", "Nom"]),
			gender: EN_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
			number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			reflex: EN_FEATURE_SCHEMA.reflex,
		}),
	),
});

export type EnPronounFeatureBags = z.infer<typeof EnPronounFeatureBagsSchema>;

type _EnPronounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnPronounFeatureBags>
>;
