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

export const HeNumeralFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			definite: HE_FEATURE_SCHEMA.definite.extract(["Cons", "Def"]),
			gender: featureValueSetSchema(
				HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
			),
			number: featureValueSetSchema(
				HE_FEATURE_SCHEMA.numberWithDual.extract(["Dual", "Plur"]),
			),
		}),
	),
});

export type HeNumeralFeatureBags = z.infer<typeof HeNumeralFeatureBagsSchema>;

type _HeNumeralFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeNumeralFeatureBags>
>;
