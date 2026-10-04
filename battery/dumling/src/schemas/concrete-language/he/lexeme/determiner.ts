import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeDeterminerFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		pronType: HE_FEATURE_SCHEMA.pronType.extract(["Art", "Int"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			definite: HE_FEATURE_SCHEMA.definite.extract(["Cons", "Def"]),
			gender: featureValueSetSchema(
				HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
			),
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		}),
	),
});
