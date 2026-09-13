import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HePronounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		definite: HE_FEATURE_SCHEMA.definite.extract(["Def"]),
		pronType: HE_FEATURE_SCHEMA.pronType.extract([
			"Dem",
			"Ind",
			"Int",
			"Prs",
		]),
		reflex: HE_FEATURE_SCHEMA.reflex,
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			gender: featureValueSetSchema(
				HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
			),
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			person: HE_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
		}),
	),
});

export type HePronounFeatureBags = z.infer<typeof HePronounFeatureBagsSchema>;

type _HePronounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HePronounFeatureBags>
>;
