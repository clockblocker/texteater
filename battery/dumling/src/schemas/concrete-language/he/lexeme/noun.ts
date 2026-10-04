import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeNounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: HE_FEATURE_SCHEMA.abbr,
		gender: featureValueSetSchema(
			HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
		),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			definite: HE_FEATURE_SCHEMA.nominalDefinite,
			number: featureValueSetSchema(HE_FEATURE_SCHEMA.numberWithDual),
		}),
	),
});
