import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeNumeralFeatureBagsSchema = featureBags({
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
