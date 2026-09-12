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

export const HeProperNounFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: HE_FEATURE_SCHEMA.abbr,
		gender: featureValueSetSchema(
			HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
		),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});

export type HeProperNounFeatureBags = z.infer<
	typeof HeProperNounFeatureBagsSchema
>;

type _HeProperNounFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeProperNounFeatureBags>
>;
